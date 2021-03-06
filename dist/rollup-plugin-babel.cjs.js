'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var babelCore = require('babel-core');
var rollupPluginutils = require('rollup-pluginutils');
var classes = _interopDefault(require('babel-plugin-transform-es2015-classes'));

function assign ( target, source ) {
	Object.keys( source ).forEach( function (key) {
		target[ key ] = source[ key ];
	});
	return target;
}

var warned = {};
function warnOnce ( warn, msg ) {
	if ( warned[ msg ] ) { return; }
	warned[ msg ] = true;
	warn( msg );
}

var INLINE = {};
var RUNTIME = {};
var BUNDLED = {};

var HELPERS = '\0babelHelpers';

var preflightCheckResults = {};

function preflightCheck ( options, dir ) {
	if ( !preflightCheckResults[ dir ] ) {
		var helpers;

		options = assign( {}, options );
		delete options.only;
		delete options.ignore;

		options.filename = path.join( dir, 'x.js' );

		options.plugins = options.plugins ? options.plugins.concat( classes ) : [ classes ];


		var check = babelCore.transform( 'export default class Foo {}', options ).code;

		if ( !~check.indexOf( 'export default' ) && !~check.indexOf( 'export { Foo as default }' ) ) { throw new Error( 'It looks like your Babel configuration specifies a module transformer. Please disable it. See https://github.com/rollup/rollup-plugin-babel#configuring-babel for more information' ); }

		if ( ~check.indexOf( 'import _classCallCheck from' ) ) { helpers = RUNTIME; }
		else if ( ~check.indexOf( 'function _classCallCheck' ) ) { helpers = INLINE; }
		else if ( ~check.indexOf( 'babelHelpers' ) ) { helpers = BUNDLED; }

		else {
			throw new Error( 'An unexpected situation arose. Please raise an issue at https://github.com/rollup/rollup-plugin-babel/issues. Thanks!' );
		}

		preflightCheckResults[ dir ] = helpers;
	}

	return preflightCheckResults[ dir ];
}

var keywordHelpers = [ 'typeof', 'extends', 'instanceof' ];

var outputed = false;

function babel ( options ) {
    var originalOptions = options;
	options = assign( {}, options || {} );
	var inlineHelpers = {};

	var filter = rollupPluginutils.createFilter( options.include, options.exclude );
	delete options.include;
	delete options.exclude;

	if ( options.sourceMap !== false ) { options.sourceMaps = true; }
	if ( options.sourceMaps !== false ) { options.sourceMaps = true; }
	delete options.sourceMap;

	var runtimeHelpers = options.runtimeHelpers;
	delete options.runtimeHelpers;

	var externalHelpers;
	if ( options.externalHelpers ) { externalHelpers = true; }
	delete options.externalHelpers;

	var externalHelpersWhitelist = null;
	if ( options.externalHelpersWhitelist ) { externalHelpersWhitelist = options.externalHelpersWhitelist; }
	delete options.externalHelpersWhitelist;

	var warn = function (msg) { return console.warn(msg); }; // eslint-disable-line no-console

	return {
		name: 'babel',

		options: function options$1 ( options ) {
			warn = options.onwarn || warn;
		},

		resolveId: function resolveId ( id ) {
			if ( id === HELPERS ) { return id; }
		},

		load: function load ( id ) {
			if ( id === HELPERS ) {
				var pattern = new RegExp( ("babelHelpers\\.(" + (keywordHelpers.join('|')) + ")"), 'g' );

				var helpers = babelCore.buildExternalHelpers( externalHelpersWhitelist, 'var' )
					.replace( pattern, 'var _$1' )
					.replace( /^babelHelpers\./gm, 'export var ' ) +
					"\n\nexport { " + (keywordHelpers.map( function (word) { return ("_" + word + " as " + word); }).join( ', ')) + " }";

                //1111111111111111111111111111111111111111
                helpers = babelCore.transform( helpers, originalOptions ).code;

				return helpers;
			}
		},

		transform: function transform$1 ( code, id ) {
			if ( !filter( id ) ) { return null; }
			if ( id === HELPERS ) { return null; }

			var helpers = preflightCheck( options, path.dirname( id ) );
			var localOpts = assign({ filename: id }, options );

			var transformed = babelCore.transform( code, localOpts );
			var ref = transformed.metadata;
			var usedHelpers = ref.usedHelpers;

			if ( usedHelpers.length ) {
				if ( helpers === BUNDLED ) {
					if ( !externalHelpers ) {
						transformed.code += "\n\nimport * as babelHelpers from '" + HELPERS + "';";
					}
				} else if ( helpers === RUNTIME ) {
					if ( !runtimeHelpers ) {
						throw new Error( 'Runtime helpers are not enabled. Either exclude the transform-runtime Babel plugin or pass the `runtimeHelpers: true` option. See https://github.com/rollup/rollup-plugin-babel#configuring-babel for more information' );
					}
				} else {
					usedHelpers.forEach( function (helper) {
						if ( inlineHelpers[ helper ] ) {
							warnOnce( warn, ("The '" + helper + "' Babel helper is used more than once in your code. It's strongly recommended that you use the \"external-helpers\" plugin or the \"es2015-rollup\" preset. See https://github.com/rollup/rollup-plugin-babel#configuring-babel for more information") );
						}

						inlineHelpers[ helper ] = true;
					});
				}
			}

			return {
				code: transformed.code,
				map: transformed.map
			};
		}
	};
}

module.exports = babel;
//# sourceMappingURL=rollup-plugin-babel.cjs.js.map
