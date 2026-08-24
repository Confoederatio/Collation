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
	 * Computes the X^T * X matrix manually to save memory.
	 * @alias Statistics._computeXT_X
	 *
	 * @param {Array<Array<number>>} arg0_X
	 *
	 * @returns {Array<Array<number>>}
	 */
	Statistics._computeXT_X = function (arg0_X) {
		let X = arg0_X;
		let N = X.length;
		let K = X[0].length;
		
		let XT_X = new Array(K).fill(0).map(() => new Array(K).fill(0));
		
		//Optimisation: Halved loop multiplications taking advantage of reflectional symmetry
		for (let i = 0; i < N; i++) {
			let rowX = X[i];
			for (let j = 0; j < K; j++) {
				let x_j = rowX[j];
				for (let k = j; k < K; k++) {
					XT_X[j][k] += x_j * rowX[k];
				}
			}
		}
		
		//Mirror the computed lower half logic to the upper half logic
		for (let j = 0; j < K; j++) {
			for (let k = 0; k < j; k++) {
				XT_X[j][k] = XT_X[k][j];
			}
		}
		
		return XT_X;
	};
	
	/**
	 * Computes the VIF of a given matrix.
	 * @alias Statistics.computeVIF
	 *
	 * @param {Matrix|Array} arg0_X
	 *
	 * @returns {Array<number>}
	 */
	Statistics.computeVIF = function (arg0_X) {
		//Convert from parameters
		let X = arg0_X;
		try { X = X._data || X; } catch (e) {}
		
		//Declare local instance variables
		let XT_X = Statistics._computeXT_X(X);
		let XT_X_inv = mathjs.inv(XT_X);
		try { XT_X_inv = XT_X_inv._data || XT_X_inv; } catch(e) {}
		
		let vif = XT_X_inv.map((row, i) => row[i]);
		
		//Return statement
		return vif;
	};
	
	/**
	 * Returns the condition number of a given matrix.
	 * @alias Statistics.conditionNumber
	 *
	 * @param {Matrix|Array} arg0_X
	 * @param {number} [arg1_epsilon=1e-12]
	 *
	 * @returns {number}
	 */
	Statistics.conditionNumber = function (arg0_X, arg1_epsilon) {
		//Convert from parameters
		let X = arg0_X;
		let epsilon = Math.returnSafeNumber(arg1_epsilon, 1e-12);
		try { X = X._data || X; } catch (e) {}
		
		//Declare local instance variables
		let XT_X = Statistics._computeXT_X(X);
		
		let matrix = new ml_matrix.SVD(XT_X, { autoTranspose: true });
		let singular_values = matrix.diagonal.map(v => Math.sqrt(Math.max(0, v)));
		
		//Find max and min singular values
		let max_s = Math.max(...singular_values);
		let min_s = Math.max(Math.min(...singular_values), epsilon); //Ensure min_s is never 0
		
		//Return statement
		return max_s/min_s;
	};
	
	/**
	 * Removes high VIF features for a given matrix.
	 * @alias Statistics.removeHighVIFFeatures
	 *
	 * @param {Matrix|Array} arg0_X
	 * @param {number} [arg1_threshold=10]
	 *
	 * @returns {Array<Array<number>>}
	 */
	Statistics.removeHighVIFFeatures = function (arg0_X, arg1_threshold) {
		//Convert from parameters
		let X = arg0_X;
		let threshold = Math.returnSafeNumber(arg1_threshold, 10);
		try { X = X._data || X; } catch(e) {}
		
		//Declare local instance variables
		let vif_scores = Statistics.computeVIF(X);
		let to_keep = vif_scores.map((vif, i) => (vif < threshold));
		
		//Return statement
		return X.map((row) => row.filter((_, index) => to_keep[index]));
	};
	
	/**
	 * Performs Ridge Regression on two matrices.
	 * @alias Statistics.ridgeRegression
	 *
	 * @param {Matrix|Array} arg0_X
	 * @param {Matrix|Array} arg1_Y
	 * @param {number} [arg2_lambda=1e-3]
	 *
	 * @returns {Matrix|Array}
	 */
	Statistics.ridgeRegression = function (arg0_X, arg1_Y, arg2_lambda) {
		//Convert from parameters
		let X = arg0_X;
		let Y = arg1_Y;
		let lambda = Math.returnSafeNumber(arg2_lambda, 1e-3);
		
		try { X = X._data || X; } catch (e) {}
		try { Y = Y._data || Y; } catch (e) {}
		
		//Declare local instance variables
		let N = X.length;
		let K = X[0].length;
		
		let XT_X = new Array(K).fill(0).map(() => new Array(K).fill(0));
		let XT_Y = new Array(K).fill(0).map(() => [0]);
		
		for (let i = 0; i < N; i++) {
			let rowX = X[i];
			let yVal = Y[i][0];
			for (let j = 0; j < K; j++) {
				let x_j = rowX[j];
				XT_Y[j][0] += x_j * yVal;
				for (let k = j; k < K; k++) {
					XT_X[j][k] += x_j * rowX[k];
				}
			}
		}
		
		for (let j = 0; j < K; j++) {
			for (let k = 0; k < j; k++) {
				XT_X[j][k] = XT_X[k][j];
			}
		}
		
		let XT_X_mat = mathjs.matrix(XT_X);
		let XT_Y_mat = mathjs.matrix(XT_Y);
		let identity = mathjs.identity(K);
		
		let XT_X_reg = mathjs.add(XT_X_mat, mathjs.multiply(identity, lambda)); //Ridge term
		
		//Return statement; return beta
		return mathjs.multiply(mathjs.inv(XT_X_reg), XT_Y_mat);
	};
	
	/**
	 * Trains a raster-based OLS model given a fitted covariates object { X, Y, keys }.
	 * @alias Statistics.trainOLSModel
	 *
	 * @param {string} arg0_output_file_path
	 * @param {Object} arg1_covariates_obj
	 * @param {Object} [arg2_options]
	 *  @param {boolean} [arg2_options.dynamic_lambda=false] - Condition numbers are dynamically selected if true.
	 *  @param {number} [arg2_options.lambda=1e9]
	 *  @param {boolean} [arg2_options.remove_high_vif_features=false] - Whether to remove high VIF features.
	 *  @param {string} [arg2_options.key]
	 *
	 * @returns {Promise<Object>}
	 */
	Statistics.trainOLSModel = async function (arg0_output_file_path, arg1_covariates_obj, arg2_options) {
		//Convert from parameters
		let output_file_path = path.resolve(arg0_output_file_path);
		let covariates_obj = arg1_covariates_obj;
		let options = (arg2_options) ? arg2_options : {};
		
		//Initialise options
		if (!options.key) options.key = output_file_path;
		
		//Declare local instance variables
		let basename = path.basename(output_file_path);
		let { keys, X, Y } = covariates_obj;
		
		console.log(`- Performing OLS for ${basename}.`);
		
		//1. Remove multicollinear features using VIF selection if specified
		if (options.remove_high_vif_features) {
			X = Statistics.removeHighVIFFeatures(X, 10);
			console.log(` - Removed high VIF features.`);
		}
		
		//2. Apply Ridge Regression to stabilise coefficients
		let selected_lambda = Math.returnSafeNumber(options.lambda, 1e9);
		console.log(`- Computed preliminary matrices.`);
		
		if (options.dynamic_lambda) {
			let condition_number = Statistics.conditionNumber(X);
			if (condition_number > 1e6) { selected_lambda = 1e9; }
			else if (condition_number > 1e4) { selected_lambda = 1e7; }
			else if (condition_number > 1e2) { selected_lambda = 1e5; }
			else { selected_lambda = 1e3; }
			console.log(`- Condition Number: ${condition_number}, using Lambda = ${selected_lambda}`);
		}
		
		let beta = Statistics.ridgeRegression(X, Y, selected_lambda);
		console.log(`- Applied Ridge Regression to stabilise coefficients.`);
		
		//3. Convert coefficients to JSON
		let beta_arr = beta._data || (beta.toArray ? beta.toArray() : beta);
		let coefficients = beta_arr.flat();
		console.log(`- Computed coefficients.`);
		
		//Save model to JSON
		let model_data_obj = {
			key: options.key,
			coefficients: Object.fromEntries(
				keys.map((key, i) => [key, coefficients[i]])
			)
		};
		
		fs.writeFileSync(output_file_path, JSON.stringify(model_data_obj, null, 2));
		console.log(`OLS model data for ${options.key} saved successfully in ${output_file_path}.`);
		
		//Return statement
		return model_data_obj;
	};
}