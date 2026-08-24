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
	 * Computes the VIF of a given matrix.
	 * @alias Statistics.computeVIF
	 * 
	 * @param {Matrix} arg0_X
	 * 
	 * @returns {Matrix}
	 */
	Statistics.computeVIF = function (arg0_X) {
		//Convert from parameters
		let X = arg0_X;
		
		//Declare local instance variables
		let XT_X = mathjs.multiply(mathjs.transpose(X), X);
		let XT_X_inv = mathjs.inv(XT_X);
		let vif = XT_X_inv.map((row, i) => row[i]);
		
		//Return statement
		return vif;
	};
	
	/**
	 * Returns the condition number of a given matrix.
	 * @alias Statistics.conditionNumber
	 * 
	 * @param {Matrix} arg0_X
	 * @param {number} [arg1_epsilon=1e-12]
	 * 
	 * @returns {number}
	 */
	Statistics.conditionNumber = function (arg0_X, arg1_epsilon) {
		//Convert from parameters
		let X = arg0_X;
		let epsilon = Math.returnSafeNumber(arg1_epsilon, 1e-12);
		
		//Declare local instance variables
		try {
			X = X._data;
		} catch (e) {}
		
		let matrix = new ml_matrix.SVD(X, { autoTranspose: true });
		let singular_values = matrix.diagonal;
		
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
	 * @param {Matrix} arg0_X
	 * @param {number} [arg1_threshold=10]
	 * 
	 * @returns {Matrix}
	 */
	Statistics.removeHighVIFFeatures = function (arg0_X, arg1_threshold) {
		//Convert from parameters
		let X = arg0_X;
		let threshold = Math.returnSafeNumber(arg1_threshold, 10);
		
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
	 * @param {Matrix} arg0_X
	 * @param {Matrix} arg1_Y
	 * @param {number} [arg2_lambda=1e-3]
	 * 
	 * @returns {Matrix}
	 */
	Statistics.ridgeRegression = function (arg0_X, arg1_Y, arg2_lambda) {
		//Convert from parameters
		let X = arg0_X;
		let Y = arg1_Y;
		let lambda = Math.returnSafeNumber(arg2_lambda, 1e-3);
		
		//Declare local instance variables
		let XT = mathjs.transpose(X);
		let XT_X = mathjs.multiply(XT, X);
		let identity = mathjs.identity(XT_X.size()[0]);
		
		let XT_X_reg = mathjs.add(XT_X, mathjs.multiply(identity, lambda)); //Ridge term
		let XT_Y = mathjs.multiply(XT, Y);
		
		//Return statement; return beta
		return mathjs.multiply(mathjs.inv(XT_X_reg), XT_Y);
	};
	
	/**
	 * Trains a raster-based OLS model given a fitted covariates object { X, Y, keys }.
	 * @alias Statistics.trainOLSModel
	 * 
	 * @param {string} arg0_output_file_path
	 * @param {Object} arg1_covariates_obj
	 * @param {Object} [arg2_options]
	 *  @param {boolean} [arg2_options.dynamic_lambda=false] - Condition numbers are dynamically selected if true.
	 *  @param {boolean} [arg2_options.remove_high_vif_features=false] - Whether to remove high VIF features.
	 *  @param {string} [arg2_options.key]
	 *  
	 * @returns {Promise<Object>}
	 */
	Statistics.trainOLSModel = async function (arg0_output_file_path, arg1_covariates_obj, arg2_options) { //[WIP] - Finish function body
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
		let selected_lambda = 1e9;
		let X_matrix = mathjs.matrix(X);
		let Y_matrix = mathjs.matrix(Y);
		console.log(`- Computed preliminary matrices.`);
		
		if (options.dynamic_lambda) {
			let condition_number = Statistics.conditionNumber(X_matrix);
				if (condition_number > 1e6) { selected_lambda = 1e9; } 
				else if (condition_number > 1e4) { selected_lambda = 1e7; }
				else if (condition_number > 1e2) { selected_lambda = 1e5; }
				else { selected_lambda = 1e3; }
			log.info(`- Condition Number: ${condition_number}, using Lambda = ${selected_lambda}`);
		}
		
		let beta = Statistics.ridgeRegression(X_matrix, Y_matrix, selected_lambda);
		console.log(`- Applied Ridge Regression to stabilise coefficients.`);
		
		//3. Covert coefficients to JSON
		let coefficients = beta.toArray().flat();
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