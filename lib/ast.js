"use strict";


const ignoreKeys = {'type': 1, 'pos': 1};

function Node(type) {
	this.type = type;
}

function _node(type, keys) {
    return function(/* arg ... */) {
        const node = new Node(type);
        const extract = ['pos'].concat(keys);
        const args = Array.prototype.slice.call(arguments);
        // copy key/vals from args to node, checking for dupes and missing keys
        extract.forEach(function(k, ix) {
            if ( node.hasOwnProperty(k) ) {
                throw new Error('duplicate key in node: ' + k);
            } else if ( ix >= args.length ) {
                throw new Error('too few arguments while building AST node');
            }
            node[k] = args[ix];
        });
        return node;
    };
}

module.exports = {
	'String'              : _node('String', ['chars']),
	'Bool'                : _node('Bool', ['value']),
	'Value'               : _node('Value', ['value']), // TODO do we want this?
	'Variable'            : _node('Variable', ['name']),
	'KeyVal'              : _node('KeyVal', ['name', 'value']),
	'Argument'            : _node('Argument', ['name', 'value']),
	'Directive'           : _node('Directive', ['name', 'arguments']),
	'NamedType'           : _node('NamedType', ['name']),
	'ListType'            : _node('ListType', ['type']),
	'Type'                : _node('Type', ['baseType', 'isNonNull']),
	'Number'              : _node('Number', 'int', 'fraction', 'exponent'), // TODO sign?  or is that part of 'int'?
	'Enum'                : _node('Enum', ['name']),
	'List'                : _node('List', ['values']),
	'Object'              : _node('Object', ['keyvals']),
	'VariableDefinition'  : _node('VariableDefinition', ['variable', 'type', 'defaultValue']),
	'TypeCondition'       : _node('TypeCondition', ['namedType']),
	'SelectionSet'        : _node('SelectionSet', ['selections']),
	'Arguments'			  : _node('Arguments', ['arguments']),
	'Alias'				  : _node('Alias', ['name']),
	'Field'               : _node('Field', ['alias', 'name', 'arguments', 'directives', 'selectionSet']),
	'FragmentSpread'      : _node('FragmentSpread', ['fragmentName', 'directives']),
	'InlineFragment'      : _node('InlineFragment', ['typeCondition', 'directives', 'selectionSet']),
	'FragmentDefinition'  : _node('FragmentDefinition', ['fragmentName', 'typeCondition', 'directives', 'selectionSet']),
	'OperationDefinition' : _node('OperationDefinition', ['operationType', 'name', 'variableDefinitions', 'directives', 'selectionSet']),
// 	'Definition': _node('Definition', ['value']), // TODO do we want this?
	'Document'            : _node('Document', ['definitions']),

	'Interface': undefined,
	'TypeDefinition': undefined,
	'Union': undefined,
	'Extends': undefined,
};
