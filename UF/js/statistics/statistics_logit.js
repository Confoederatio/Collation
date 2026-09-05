//Initialise functions
{
	if (!global.Statistics)
		/**
		 * The namespace for all UF/Statistics utility functions, typically for static methods.
		 *
		 * @namespace Statistics
		 */
		global.Statistics = {};
	
	/**
	 * Computes approximate per-class standard errors from the Hessian at convergence.
	 * Uses the standard class-vs-rest approximation H_c = Σ p_ic(1-p_ic) x_i x_i^T + λI.
	 * @alias Statistics.computeMultinomialStandardErrors
	 *
	 * @param {Array<Array<number>>} arg0_X
	 * @param {Array<Array<number>>} arg1_Y
	 * @param {Object} arg2_result - Result object from Statistics.multinomialLogitRegression.
	 * @param {number} [arg3_lambda=1e-3]
	 *
	 * @returns {Object} - Map of class labels to arrays of standard errors.
	 */
	Statistics.computeMultinomialStandardErrors = function (arg0_X, arg1_Y, arg2_result, arg3_lambda) {
		//Convert from parameters
		let X = arg0_X;
		let Y = arg1_Y;
		let result = arg2_result;
		let lambda = Math.returnSafeNumber(arg3_lambda, 1e-3);
		
		//Declare local instance variables
		let N = X.length;
		let K = X[0].length;
		let classes = result.classes;
		let beta = result.beta;
		let C = classes.length;
		let standard_errors = {};
		
		//Iterate over all non-reference classes
		for (let c = 1; c < C; c++) {
			let hessian = new Array(K).fill(0).map(() => new Array(K).fill(0));
			
			//Accumulate Hessian; halved loop taking advantage of reflectional symmetry
			for (let i = 0; i < N; i++) {
				let row_X = X[i];
				let logits = new Array(C).fill(0);
				
				for (let cc = 1; cc < C; cc++)
					for (let j = 0; j < K; j++)
						logits[cc] += row_X[j]*beta[cc][j];
				
				let probabilities = Statistics.softmax(logits);
				let weight = probabilities[c]*(1 - probabilities[c]);
				if (weight < 1e-12) continue;
				
				for (let j = 0; j < K; j++)
					for (let k = j; k < K; k++)
						hessian[j][k] += weight*row_X[j]*row_X[k];
			}
			
			//Mirror the computed lower half logic to the upper half logic
			for (let j = 0; j < K; j++)
				for (let k = 0; k < j; k++)
					hessian[j][k] = hessian[k][j];
			
			//Add ridge term to diagonal for invertibility
			for (let j = 0; j < K; j++)
				hessian[j][j] += lambda;
			
			//Attempt standard inverse; fall back to Moore-Penrose pseudo-inverse
			let hessian_inv;
			try {
				hessian_inv = mathjs.inv(hessian);
			} catch (e) {
				hessian_inv = mathjs.pinv(hessian);
			}
			try { hessian_inv = hessian_inv._data || hessian_inv; } catch (e) {}
			
			standard_errors[String(classes[c])] = hessian_inv.map((row, j) =>
				Math.sqrt(Math.max(0, row[j]))
			);
		}
		
		//Return statement
		return standard_errors;
	};
	
	/**
	 * Evaluates a trained multinomial logit model against a covariates object, returning
	 * overall accuracy and a confusion matrix.
	 * @alias Statistics.evaluateMultinomialModel
	 *
	 * @param {string|Object} arg0_model - JSON model object or file path to JSON model.
	 * @param {Object} arg1_covariates_obj - { keys, X, Y }
	 *
	 * @returns {Object} - { accuracy, confusion_matrix, sample_count }
	 */
	Statistics.evaluateMultinomialModel = function (arg0_model, arg1_covariates_obj) {
		//Convert from parameters
		let model_obj = (typeof arg0_model === "string") ?
			JSON.parse(fs.readFileSync(path.resolve(arg0_model), "utf8")) : arg0_model;
		let { keys, X, Y } = arg1_covariates_obj;
		
		//Declare local instance variables
		let classes = model_obj.classes;
		let confusion_matrix = {};
		let correct_count = 0;
		
		//Iterate over all samples
		for (let i = 0; i < X.length; i++) {
			let local_features = {};
			for (let j = 0; j < keys.length; j++)
				local_features[keys[j]] = X[i][j];
			
			let probabilities = Statistics.predictMultinomialProbabilities(local_features, model_obj);
			let actual_class = String((Array.isArray(Y[i])) ? Y[i][0] : Y[i]);
			
			//Argmax over class probabilities
			let best_class = String(classes[0]);
			let best_probability = -1;
			
			for (let c = 0; c < classes.length; c++) {
				let local_probability = probabilities[String(classes[c])] || 0;
				if (local_probability > best_probability) {
					best_probability = local_probability;
					best_class = String(classes[c]);
				}
			}
			
			if (!confusion_matrix[actual_class]) confusion_matrix[actual_class] = {};
			confusion_matrix[actual_class][best_class] =
				(confusion_matrix[actual_class][best_class] || 0) + 1;
			
			if (best_class === actual_class) correct_count++;
		}
		
		//Return statement
		return {
			accuracy: (X.length > 0) ? correct_count/X.length : 0,
			confusion_matrix: confusion_matrix,
			sample_count: X.length
		};
	};
	
	/**
	 * Loads a stack of covariates for a categorical class raster for multinomial logit training.
	 * Unlike loadOLSCovariates, zero-valued class labels are meaningful and retained.
	 * @alias Statistics.loadMultinomialCovariates
	 *
	 * @param {string} arg0_class_file_path - Raster whose pixel values are integer class labels.
	 * @param {Object} [arg1_options]
	 *  @param {Object} arg1_options.covariates_obj
	 *  @param {string} [arg1_options.class_format="int32"]
	 *  @param {any[]} [arg1_options.formatting_parameters]
	 *  @param {number} [arg1_options.nodata_value] - Class label treated as nodata and dropped.
	 *
	 * @returns {Promise<Object>} - { keys, X, Y }
	 */
	Statistics.loadMultinomialCovariates = async function (arg0_class_file_path, arg1_options) {
		//Convert from parameters
		let class_file_path = path.resolve(arg0_class_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.class_format) options.class_format = "int32";
		if (!options.formatting_parameters) options.formatting_parameters = [];
		
		//Declare local instance variables
		let input_data = [];
		let class_image = GeoPNG.loadNumberRasterImage(class_file_path, {
			format: options.class_format
		});
		let class_data = class_image.data;
		let valid_keys = [];
		
		//Iterate over all input stocks; load each input variable as a predictor
		Object.iterate(options.covariates_obj, (local_key, local_value) => {
			let local_file_path = (typeof local_value === "function") ?
				local_value(...options.formatting_parameters) : local_value;
			let local_format = "int32";
			
			//Destructure if array is returned
			if (Array.isArray(local_file_path)) {
				local_format = local_file_path[1];
				local_file_path = local_file_path[0];
			}
			
			//Attempt to load the covariate raster; drop it on failure
			try {
				let local_rawdata = GeoPNG.loadNumberRasterImage(local_file_path, {
					format: local_format
				}).data;
				
				input_data.push(local_rawdata);
				valid_keys.push(local_key);
			} catch (e) {
				console.log(`- Missing covariate raster for ${local_key} at ${local_file_path}. Dropping coefficient for this run.`);
			}
		});
		
		//Transpose input data to match format [samples, features], discarding NaNs safely
		let feature_count = input_data.length;
		let sample_count = class_data.length;
		let X = [];
		let Y = [];
		
		//Iterate over sample_count
		for (let i = 0; i < sample_count; i++) {
			let is_valid = true;
			let class_value = class_data[i];
			
			if (isNaN(class_value)) is_valid = false;
			if (options.nodata_value !== undefined && class_value === options.nodata_value)
				is_valid = false;
			
			//Iterate over feature_count
			let local_row = new Array(feature_count);
			
			if (is_valid)
				for (let x = 0; x < feature_count; x++) {
					let local_value = input_data[x][i];
					
					if (isNaN(local_value)) {
						is_valid = false;
						break;
					}
					local_row[x] = local_value;
				}
			
			if (is_valid) {
				X.push(local_row);
				Y.push([class_value]);
			}
		}
		
		//Return statement
		return { keys: valid_keys, X: X, Y: Y };
	};
	
	/**
	 * Performs L2-regularised Multinomial Logistic Regression (softmax regression) via batch
	 * gradient descent with momentum. The first observed class is the reference class with
	 * coefficients fixed at zero for identifiability.
	 * @alias Statistics.multinomialLogitRegression
	 *
	 * @param {Matrix|Array} arg0_X
	 * @param {Matrix|Array} arg1_Y - Nx1 matrix of integer class labels.
	 * @param {Object} [arg2_options]
	 *  @param {boolean} [arg2_options.debug=false]
	 *  @param {number} [arg2_options.lambda=1e-3] - L2 regularisation strength (ridge analogue).
	 *  @param {number} [arg2_options.learning_rate=0.5]
	 *  @param {number} [arg2_options.max_iterations=1000]
	 *  @param {number} [arg2_options.momentum=0.9]
	 *  @param {number} [arg2_options.tolerance=1e-8]
	 *
	 * @returns {Object|null} - { beta, classes, converged, iterations, log_likelihood }
	 */
	Statistics.multinomialLogitRegression = function (arg0_X, arg1_Y, arg2_options) {
		//Convert from parameters
		let X = arg0_X;
		let Y = arg1_Y;
		let options = (arg2_options) ? arg2_options : {};
		
		try { X = X._data || X; } catch (e) {}
		try { Y = Y._data || Y; } catch (e) {}
		
		//Initialise options
		let lambda = Math.returnSafeNumber(options.lambda, 1e-3);
		let learning_rate = Math.returnSafeNumber(options.learning_rate, 0.5);
		let max_iterations = Math.returnSafeNumber(options.max_iterations, 1000);
		let momentum = Math.returnSafeNumber(options.momentum, 0.9);
		let tolerance = Math.returnSafeNumber(options.tolerance, 1e-8);
		
		//Declare local instance variables
		let N = X.length;
		if (N === 0) return null;
		
		let K = X[0].length;
		if (K === 0) return null;
		
		//Build class lookup; index 0 is the reference/baseline class
		let classes = [];
		let class_lookup = {};
		
		for (let i = 0; i < N; i++) {
			let local_class = (Array.isArray(Y[i])) ? Y[i][0] : Y[i];
			
			if (class_lookup[local_class] === undefined) {
				class_lookup[local_class] = classes.length;
				classes.push(local_class);
			}
		}
		
		let C = classes.length;
		if (C < 2) {
			console.warn(`- Multinomial logit requires at least 2 classes, received ${C}.`);
			return null;
		}
		
		//Compute column-wise RMS scales to prevent scale-mismatch instability
		let scales = new Array(K).fill(1);
		let X_scaled = new Array(N).fill(0).map(() => new Array(K).fill(0));
		
		for (let j = 0; j < K; j++) {
			let sum_sq = 0;
			for (let i = 0; i < N; i++)
				sum_sq += X[i][j]*X[i][j];
			
			let rms = Math.sqrt(sum_sq/N);
			scales[j] = (rms > 1e-12) ? rms : 1;
		}
		
		//Scale covariates
		for (let i = 0; i < N; i++)
			for (let j = 0; j < K; j++)
				X_scaled[i][j] = X[i][j]/scales[j];
		
		//Initialise coefficients (CxK) and velocity; row 0 stays zeroed (reference class)
		let beta = new Array(C).fill(0).map(() => new Array(K).fill(0));
		let velocity = new Array(C).fill(0).map(() => new Array(K).fill(0));
		let converged = false;
		let iterations_run = 0;
		let log_likelihood = 0;
		
		//Main gradient descent loop
		for (let iter = 0; iter < max_iterations; iter++) {
			let gradient = new Array(C).fill(0).map(() => new Array(K).fill(0));
			log_likelihood = 0;
			
			//Accumulate gradients over all samples
			for (let i = 0; i < N; i++) {
				let row_X = X_scaled[i];
				let y_idx = class_lookup[(Array.isArray(Y[i])) ? Y[i][0] : Y[i]];
				
				//Compute logits for this sample
				let logits = new Array(C).fill(0);
				for (let c = 1; c < C; c++)
					for (let j = 0; j < K; j++)
						logits[c] += row_X[j]*beta[c][j];
				
				let probabilities = Statistics.softmax(logits);
				log_likelihood += Math.log(Math.max(probabilities[y_idx], 1e-15));
				
				//Gradient of NLL w.r.t. beta_c is (p_c - 1[y=c]) * x
				for (let c = 1; c < C; c++) {
					let residual = probabilities[c] - ((c === y_idx) ? 1 : 0);
					for (let j = 0; j < K; j++)
						gradient[c][j] += residual*row_X[j];
				}
			}
			
			//Apply L2 penalty and momentum update
			let max_update = 0;
			
			for (let c = 1; c < C; c++)
				for (let j = 0; j < K; j++) {
					let local_gradient = gradient[c][j]/N + lambda*beta[c][j];
					
					velocity[c][j] = momentum*velocity[c][j] - learning_rate*local_gradient;
					beta[c][j] += velocity[c][j];
					max_update = Math.max(max_update, Math.abs(velocity[c][j]));
				}
			
			iterations_run = iter + 1;
			
			if (options.debug && iter % 100 === 0)
				console.log(`- Iteration ${iter}: NLL = ${(-log_likelihood/N).toFixed(6)}, max_update = ${max_update.toExponential(2)}`);
			
			if (max_update < tolerance) {
				converged = true;
				break;
			}
		}
		
		//Convert scaled coefficients back to original covariate scale
		let beta_orig = new Array(C).fill(0).map(() => new Array(K).fill(0));
		
		for (let c = 1; c < C; c++)
			for (let j = 0; j < K; j++)
				beta_orig[c][j] = beta[c][j]/scales[j];
		
		//Return statement
		return {
			beta: beta_orig,
			classes: classes,
			converged: converged,
			iterations: iterations_run,
			log_likelihood: log_likelihood
		};
	};
	
	/**
	 * Generates raster predictions from a trained multinomial logit model. Supports argmax
	 * class maps, single-class probability surfaces, or one probability raster per class.
	 * @alias Statistics.generateMultinomialRaster
	 *
	 * @param {string} arg0_output_file_path
	 * @param {Object} [arg1_options]
	 *  @param {number|string} [arg1_options.class] - Class label for "probability" output_mode.
	 *  @param {Object} arg1_options.covariates_obj
	 *  @param {string} [arg1_options.format="int32"]
	 *  @param {Array} [arg1_options.formatting_parameters]
	 *  @param {function} [arg1_options.guard_clause] - (local_index:{@link number}, rasters_obj:{@link Object}) - `false` skips pixel processing.
	 *  @param {Object|string} [arg1_options.model_obj] - File path or JSON object.
	 *  @param {string} [arg1_options.output_mode="class"] - "class" | "probability" | "probabilities".
	 *
	 *  @param {number} [arg1_options.height=2160]
	 *  @param {number} [arg1_options.width=4320]
	 *
	 * @returns {Promise<void>}
	 */
	Statistics.generateMultinomialRaster = async function (arg0_output_file_path, arg1_options) {
		//Convert from parameters
		let output_file_path = arg0_output_file_path;
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.format) options.format = "int32";
		if (!options.formatting_parameters) options.formatting_parameters = [];
		if (!options.output_mode) options.output_mode = "class";
		options.height = Math.returnSafeNumber(options.height, 2160);
		options.width = Math.returnSafeNumber(options.width, 4320);
		
		//Declare local instance variables
		let covariates_obj = options.covariates_obj;
		let model_obj = (typeof options.model_obj === "string") ?
			JSON.parse(fs.readFileSync(path.resolve(options.model_obj), "utf8")) :
			options.model_obj;
		let rasters_obj = {};
		
		//Iterate over covariates_obj and load rasters
		Object.iterate(covariates_obj, (local_key, local_value) => {
			let local_file_path = (typeof local_value === "function") ?
				local_value(...options.formatting_parameters) : local_value;
			let local_format = "int32";
			
			//Destructure if array is returned
			if (Array.isArray(local_file_path)) {
				local_format = local_file_path[1];
				local_file_path = local_file_path[0];
			}
			
			//Load existing rasters into rasters_obj
			if (fs.existsSync(local_file_path)) {
				rasters_obj[local_key] = GeoPNG.loadNumberRasterImage(local_file_path, {
					format: local_format
				});
			} else {
				console.warn(`- ${local_file_path} could not be found.`);
			}
		});
		
		//Declare shared per-pixel probability helper
		let get_probabilities = (local_index) => {
			let local_features = {};
			
			Object.iterate(rasters_obj, (local_key, local_value) => {
				local_features[local_key] = (local_value?.data) ?
					local_value.data[local_index] : 0;
			});
			
			//Return statement
			return Statistics.predictMultinomialProbabilities(local_features, model_obj);
		};
		
		let passes_guard = (local_index) => {
			if (options.guard_clause)
				return options.guard_clause(local_index, rasters_obj);
			return true;
		};
		
		//Write output file(s) from rasters_obj depending on output_mode
		if (options.output_mode === "class") {
			//Argmax class map
			GeoPNG.saveNumberRasterImage({
				file_path: output_file_path,
				format: options.format,
				width: options.width,
				height: options.height,
				function: (local_index) => {
					if (!passes_guard(local_index)) return 0;
					
					let probabilities = get_probabilities(local_index);
					let best_class = model_obj.classes[0];
					let best_probability = -1;
					
					for (let c = 0; c < model_obj.classes.length; c++) {
						let local_probability = probabilities[String(model_obj.classes[c])] || 0;
						if (local_probability > best_probability) {
							best_probability = local_probability;
							best_class = model_obj.classes[c];
						}
					}
					
					//Return statement
					return best_class;
				}
			});
			
			console.log(`Saved multinomial class raster for ${output_file_path}.`);
		} else if (options.output_mode === "probability") {
			//Single-class probability surface
			let target_class = String(options.class);
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_file_path,
				format: "float32",
				width: options.width,
				height: options.height,
				function: (local_index) => {
					if (!passes_guard(local_index)) return 0;
					
					//Return statement
					return get_probabilities(local_index)[target_class] || 0;
				}
			});
			
			console.log(`Saved multinomial probability raster (class ${target_class}) for ${output_file_path}.`);
		} else if (options.output_mode === "probabilities") {
			//One probability raster per class; class label appended before the extension
			for (let c = 0; c < model_obj.classes.length; c++) {
				let local_class = String(model_obj.classes[c]);
				let local_file_path = output_file_path.replace(/(\.[^.]+)$/, `_class_${local_class}$1`);
				
				GeoPNG.saveNumberRasterImage({
					file_path: local_file_path,
					format: "float32",
					width: options.width,
					height: options.height,
					function: (local_index) => {
						if (!passes_guard(local_index)) return 0;
						
						//Return statement
						return get_probabilities(local_index)[local_class] || 0;
					}
				});
				
				console.log(`Saved multinomial probability raster (class ${local_class}) for ${local_file_path}.`);
			}
		}
	};
	
	/**
	 * Loads a stack of covariates for point-based categorical data (e.g. household survey
	 * age/sex buckets) for multinomial logit training for a specific year.
	 * @alias Statistics.loadPointMultinomialCovariates
	 *
	 * @param {Array<Object>} arg0_points - Array of objects with { coords: [lng, lat], target: number, year: number }
	 * @param {number} arg1_year - The target year to load covariates and sample points for.
	 * @param {Object} [arg2_options]
	 *  @param {Object} arg2_options.covariates_obj
	 *  @param {number} [arg2_options.covariates_year] - Mapped year to override path resolution.
	 *  @param {Function} [arg2_options.get_pixel_function] - Custom coordinate-to-pixel mapping function.
	 *
	 * @returns {Promise<Object>} - { keys, X, Y }
	 */
	Statistics.loadPointMultinomialCovariates = async function (arg0_points, arg1_year, arg2_options) {
		//Convert from parameters
		let points_list = arg0_points;
		let target_year = parseInt(arg1_year);
		let options = (arg2_options) ? arg2_options : {};
		
		//Declare local instance variables
		let covariates_obj = options.covariates_obj;
		let covariates_year = (options.covariates_year !== undefined) ?
			parseInt(options.covariates_year) : target_year;
		let valid_keys = [];
		let loaded_rasters = {};
		let x_matrix = [];
		let y_matrix = [];
		
		//Iterate over covariates_obj and load rasters for the covariate year
		Object.iterate(covariates_obj, (local_key, local_value) => {
			let local_file_path = (typeof local_value === "function") ?
				local_value(covariates_year) : local_value;
			let local_format = "int32";
			
			if (Array.isArray(local_file_path)) {
				local_format = local_file_path[1];
				local_file_path = local_file_path[0];
			}
			
			try {
				if (fs.existsSync(local_file_path)) {
					loaded_rasters[local_key] = GeoPNG.loadNumberRasterImage(local_file_path, {
						format: local_format
					});
					valid_keys.push(local_key);
				}
			} catch (e) {
				console.log(`- Missing covariate raster for ${local_key} at ${local_file_path}.`);
			}
		});
		
		//If no valid keys were loaded, return empty structural dataset
		if (valid_keys.length === 0) return { keys: [], X: [], Y: [] };
		
		//Filter points that match the target year and have valid class targets
		let year_points = points_list.filter((p) =>
			parseInt(p.year) === target_year &&
			p.target !== undefined && p.target !== null && !isNaN(p.target)
		);
		
		for (let i = 0; i < year_points.length; i++) {
			let current_point = year_points[i];
			let coords = current_point.coords;
			let lng_val = parseFloat(coords[0]);
			let lat_val = parseFloat(coords[1]);
			let is_valid = true;
			let point_features = [];
			
			for (let j = 0; j < valid_keys.length; j++) {
				let key = valid_keys[j];
				let raster = loaded_rasters[key];
				
				let pixel_coords = (options.get_pixel_function) ?
					options.get_pixel_function(lng_val, lat_val, raster.width, raster.height) :
					Geospatiale.getEquirectangularCoordsPixel(lng_val, lat_val, { width: raster.width, height: raster.height });
				
				if (!pixel_coords) {
					is_valid = false;
					break;
				}
				
				let cx = pixel_coords[0];
				let cy = pixel_coords[1];
				let pixel_index = cy*raster.width + cx;
				let feature_value = raster.data[pixel_index];
				
				if (isNaN(feature_value)) {
					is_valid = false;
					break;
				}
				
				point_features.push(feature_value);
			}
			
			if (is_valid && point_features.length === valid_keys.length) {
				x_matrix.push(point_features);
				y_matrix.push([current_point.target]);
			}
		}
		
		//Return statement
		return { keys: valid_keys, X: x_matrix, Y: y_matrix };
	};
	
	/**
	 * Predicts class probabilities for a single feature object against a trained multinomial logit model.
	 * @alias Statistics.predictMultinomialProbabilities
	 *
	 * @param {Object} arg0_features_obj - Map of covariate keys to feature values.
	 * @param {Object} arg1_model_obj - Trained model object with .classes and .coefficients.
	 *
	 * @returns {Object} - Map of class labels to probabilities.
	 */
	Statistics.predictMultinomialProbabilities = function (arg0_features_obj, arg1_model_obj) {
		//Convert from parameters
		let features_obj = arg0_features_obj;
		let model_obj = arg1_model_obj;
		
		//Declare local instance variables
		let classes = model_obj.classes;
		let logits = new Array(classes.length).fill(0);
		
		//Iterate over all classes; missing coefficient blocks default to a logit of 0 (reference class)
		for (let c = 0; c < classes.length; c++) {
			let local_coefficients = model_obj.coefficients[String(classes[c])];
			if (!local_coefficients) continue;
			
			Object.iterate(local_coefficients, (local_key, local_value) => {
				logits[c] += Math.returnSafeNumber(features_obj[local_key])*local_value;
			});
		}
		
		let probabilities = Statistics.softmax(logits);
		let return_obj = {};
		
		for (let c = 0; c < classes.length; c++)
			return_obj[String(classes[c])] = probabilities[c];
		
		//Return statement
		return return_obj;
	};
	
	/**
	 * Computes a numerically-stable softmax over an array of logits.
	 * @alias Statistics.softmax
	 *
	 * @param {Array<number>} arg0_logits
	 *
	 * @returns {Array<number>}
	 */
	Statistics.softmax = function (arg0_logits) {
		//Convert from parameters
		let logits = arg0_logits;
		
		//Declare local instance variables
		let max_logit = Math.max(...logits);
		let sum = 0;
		let exps = new Array(logits.length);
		
		for (let i = 0; i < logits.length; i++) {
			exps[i] = Math.exp(logits[i] - max_logit);
			sum += exps[i];
		}
		
		//Return statement
		return exps.map((local_exp) => local_exp/sum);
	};
	
	/**
	 * Trains a multinomial logit model given a fitted covariates object { X, Y, keys } and
	 * saves it to JSON. Coefficients are stored per non-reference class.
	 * @alias Statistics.trainMultinomialLogitModel
	 *
	 * @param {string} arg0_output_file_path
	 * @param {Object} arg1_covariates_obj - { keys, X, Y }
	 * @param {Object} [arg2_options]
	 *  @param {boolean} [arg2_options.compute_standard_errors=false] - Hessian-based uncertainty.
	 *  @param {boolean} [arg2_options.debug=false]
	 *  @param {string} [arg2_options.key]
	 *  @param {number} [arg2_options.lambda=1e-3]
	 *  @param {number} [arg2_options.learning_rate=0.5]
	 *  @param {number} [arg2_options.max_iterations=1000]
	 *  @param {number} [arg2_options.momentum=0.9]
	 *  @param {number} [arg2_options.tolerance=1e-8]
	 *
	 * @returns {Promise<Object|null>}
	 */
	Statistics.trainMultinomialLogitModel = async function (arg0_output_file_path, arg1_covariates_obj, arg2_options) {
		//Convert from parameters
		let output_file_path = path.resolve(arg0_output_file_path);
		let covariates_obj = arg1_covariates_obj;
		let options = (arg2_options) ? arg2_options : {};
		
		//Initialise options
		if (!options.key) options.key = output_file_path;
		
		//Declare local instance variables
		let basename = path.basename(output_file_path);
		let { keys, X, Y } = covariates_obj;
		
		console.log(`- Performing multinomial logit for ${basename}.`);
		
		if (!X || X.length === 0 || !keys || keys.length === 0) {
			console.warn(`- Empty covariate data passed for ${basename}. Skipping.`);
			return null;
		}
		
		//1. Apply regularised multinomial logit regression
		let result = Statistics.multinomialLogitRegression(X, Y, options);
		
		if (!result) {
			console.warn(`- Regression failed to produce coefficients for ${basename}.`);
			return null;
		}
		
		console.log(`- Multinomial logit ${(result.converged) ? "converged" : "halted"} after ${result.iterations} iterations.`);
		
		//2. Convert coefficients to JSON, keyed by class label then covariate key
		let coefficients_obj = {};
		
		for (let c = 1; c < result.classes.length; c++) {
			coefficients_obj[String(result.classes[c])] = {};
			
			for (let j = 0; j < keys.length; j++)
				coefficients_obj[String(result.classes[c])][keys[j]] = result.beta[c][j];
		}
		
		//3. Compute Hessian-based standard errors if specified
		let standard_errors_obj;
		
		if (options.compute_standard_errors) {
			console.log(`- Computing per-class standard errors from Hessian ..`);
			let standard_errors = Statistics.computeMultinomialStandardErrors(
				X, Y, result, Math.returnSafeNumber(options.lambda, 1e-3)
			);
			
			standard_errors_obj = {};
			Object.iterate(standard_errors, (local_key, local_value) => {
				standard_errors_obj[local_key] = {};
				for (let j = 0; j < keys.length; j++)
					standard_errors_obj[local_key][keys[j]] = local_value[j];
			});
		}
		
		//Save model to JSON
		let model_data_obj = {
			key: options.key,
			type: "multinomial_logit",
			classes: result.classes,
			reference_class: result.classes[0],
			covariates: keys,
			coefficients: coefficients_obj,
			training: {
				converged: result.converged,
				iterations: result.iterations,
				lambda: Math.returnSafeNumber(options.lambda, 1e-3),
				log_likelihood: result.log_likelihood,
				sample_count: X.length
			}
		};
		if (standard_errors_obj) model_data_obj.standard_errors = standard_errors_obj;
		
		fs.writeFileSync(output_file_path, JSON.stringify(model_data_obj, null, 2));
		console.log(`Multinomial logit model data for ${options.key} saved successfully in ${output_file_path}.`);
		
		//Return statement
		return model_data_obj;
	};
}