const ast = require('./ast');

function name(node) {
//	return ast.Name(node.first + node.rest.join(''));
	return node.first + node.rest.join('');
}

function number(node) {
	const int_ = parseInt(node.integer.first + node.integer.rest.join(''), 10);
	if (node.sign === '-') { int_ *= -1; }
	const fraction = node.fraction ? parseInt(node.fraction.digits.join(''), 10) : null;
	const exponent = node.exponent ? parseInt(node.exponent.digits.join(''), 10) : null;
	return ast.Number(node._start, int_, fraction, exponent);
}

function field(node) {
	return ast.Field(node._start, 
						node.alias ? build(node.alias) : null,
						build(node.name),
						node.arguments ? build(node.arguments) : null,
						node.directives.map(build),
						node.selectionSet ? build(node.selectionSet) : null);
}

function selection(node) {
	return build(node.value);	
}

function selectionSet(node) {
	return ast.SelectionSet(node._start,
							node.selections.map(build));
}

function operationDefinition(node) {
	return ast.OperationDefinition(node._start,
									node.name ? build(node.name) : null,
									node.variableDefinitions ? build(node.variableDefinitions) : null,
									node.directives.map(build),
									build(node.selectionSet));
}

function fragmentDefinition(node) {
	return ast.FragmentDefinition(node._start, 
								build(node.fragmentName), 
								build(node.typeCondition), 
								node.directives.map(build), 
								build(node.selectionSet));
}

function definition(node) {
// return ast.Definition(build(node.value))
	return build(node.value);
}

function document(node) {
	return ast.Document(node._start, node.definitions.map(build));
}

var actions = {
		"name": name,
		"number": number,
		"field": field,
		"selection": selection,
		"selectionSet": selectionSet,
		"definition": definition,
		"document": document,
    };

function build(node) {
    var name = node._name;
    if ( actions.hasOwnProperty(name) ) {
        return actions[name](node);
    }
    throw new Error('unrecognized node._name -- ' + name + ' ' + JSON.stringify(node, null, 2));
}

module.exports = {
	'build': build,
};
