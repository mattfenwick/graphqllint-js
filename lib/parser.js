"use strict";

var u = require('unparse-js'),
    C = u.combinators,
    Cst = u.cst;

var pos     = C.position,
    item    = pos.item,
    literal = pos.literal,
    satisfy = pos.satisfy,
    oneOf   = pos.oneOf,
    not1    = pos.not1,
    string  = pos.string,
    node    = Cst.node,
    cut     = Cst.cut,
    addError = Cst.addError;
    
var many0 = C.many0, optional = C.optional,
    pure  = C.pure , seq2R = C.seq2R,
    many1 = C.many1, seq   = C.seq,
    alt   = C.alt  , error = C.error,
    seq2L = C.seq2L, not0  = C.not0,
    bind  = C.bind , sepBy0  = C.sepBy0,
    check = C.check;

function quantity(p, num) {
    var parsers = [];
    for(var i = 0; i < num; i++) {
        parsers.push(p);
    }
    return seq.apply(undefined, parsers);
}


// Ignored tokens

const _unicodeBOM = literal("\uFEFF");
const _whitespace = oneOf("\t ");
const _newline = alt(literal("\n"), string("\r\n"), literal("\r"));
const _comment = node("comment",
	["open", literal("#")],
	["rest", many0(not1(_newline))]);
const _comma = literal(",");
const ignored = many0(alt(_whitespace, _newline, _comment, _comma, _unicodeBOM));

// Lexical Tokens

const _lowercase = oneOf("abcdefghijklmnopqrstuvwxyz");
const _uppercase = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _nonzerodigit =  oneOf("123456789")
const _digit        = oneOf("0123456789");

const _name = node('name',
	["first", alt(_lowercase, _uppercase, literal("_"))],
	["rest", many0(alt(_digit, _lowercase, _uppercase, literal("_")))]);

const _zero = node("zero",
	["digit", literal("0")]);
const _integer = node("integer",
	["first", _nonzerodigit],
	["rest", many0(_digit)]);
const _fraction = node("fraction",
	["dot", literal('.')],
	["digits", cut("digits", many1(_digit))]);
const _exponent = node("exponent",
	["e", oneOf("eE")],
	["sign", optional(oneOf("+-"))],
	["digits", cut("digits", many1(_digit))]);
const _number = node("number",
	["sign", optional(literal("-"))],
	["integer", alt(_zero, _integer)],
	["fraction", optional(_fraction)],
	["exponent", optional(_exponent)]);

const _plainChar = node("plainchar",
	["char", not1(oneOf("\"\\"))]);
const _hex = oneOf('0123456789abcdefABCDEF');
const _unicodeEscape = node("unicode escape",
	["open", string("\\u")],
	["value", cut("hex digits", quantity(_hex, 4))]);
const _simpleEscape = node("simple escape",
	["open", literal("\\")],
	["char", cut("char", oneOf('"\\/bfnrt'))]);
const _string = node("string",
	["open", literal('"')],
	["body", many0(alt(_plainChar, _unicodeEscape, _simpleEscape))],
	["close", cut("close", literal('"'))]);

const _token = alt(_string, _number, _name);

const tokens = seq2R(ignored, many0(seq2L(_token, ignored)));

const _variable = node("variable",
	["open", literal("$")],
	["name", cut("name", _name)]);

const _namedType = node("named type",
	["type", _name]);

// forward declarations
const _type = error("undefined");
const _value = error("undefined");

const _listType = node("list type",
	["open", literal("[")],
	["type", cut("type", _type)],
	["close", cut("]", literal("]"))]);

const _typeCondition = node("type condition",
	["open", string("on")],
	["type", _namedType]);

_type.parser = node("type",
	["base type", alt(_namedType, _listType)],
	["bang", optional(literal("!"))]).parser;

const _argument = node("argument",
	["name", _name],
	[":", literal(":")],
	["value", _value]);

const _arguments = node("arguments",
	["open", literal("(")],
	["arguments", cut("1 or more arguments", many1(_argument))],
	["close", cut(")", literal(")"))]);

const _directive = node("directive",
	["open", literal("@")],
	["name", cut("name", _name)],
	["arguments", optional(_arguments)]);

const _boolean = node("boolean",
	["value", alt(string("true"), string("false"))]);

const _disallowedEnumValues = {'true': 1, 'false': 1, 'null': 1};
const _enum = node("enum",
	["value", check((node) => {
		const name = node.first + node.rest.join('');
		return !_disallowedEnumValues.hasOwnProperty(name);
	}, _name)]);

const _list = node("list",
	["open", literal("[")],
	["values", many0(_value)],
	["close", cut("]", literal("]"))]);

const _object = node("object",
	["open", literal("{")],
	["keyvals", many0(_argument)],
	["close", cut("}", literal("}"))]);

_value.parser = alt(_number, _string, _boolean, _enum, _list, _object, _variable).parser;

const _fragmentName = node("fragment name",
	["name", check((node) => {
		const name = node.first + node.rest.join('');
		return name !== "on";
	}, _name)]);

// Query Document

// forward declarations
const _selectionSet = error("undefined");

const _alias = node("alias",
	["name", _name],
	[":", literal(":")]);

const _field = node("field",
	["alias", optional(_alias)],
	["name", _name],
	["arguments", optional(_arguments)],
	["directives", many0(_directive)],
	["selectionSet", optional(_selectionSet)]);

const _fragmentSpread = node("fragment spread",
	["splat", string("...")],
	["fragmentName", _fragmentName],
	["directives", many0(_directive)]);

const _inlineFragment = node("inline fragment",
	["splat", string("...")],
	["typeCondition", optional(_typeCondition)],
	["directives", many0(_directive)],
	["selectionSet", _selectionSet]);

const _selection = node("selection",
	["value", alt(_field, _fragmentSpread, _inlineFragment)]);

_selectionSet.parser = node("selection set",
	["open", literal("{")],
	["selections", cut("1 or more Selections", many1(_selection))],
	["close", cut("}", literal("}"))]).parser;

const _operationType = node("operation type",
	["value", alt(string("query"), string("mutation"))]);

const _variableDefinition = node("variable definition",
	["variable", _variable],
	[":", literal(":")],
	["type", _type],
	["defaultValue", optional(_value)]); // TODO note: the value must not contain variables anywhere

const _variableDefinitions = node("variable definitions",
	["open", literal("(")],
	["definitions", cut("1 or more definitions", many1(_variableDefinition))],
	["close", cut(")", literal(")"))]);

const _operationDefinition = node("operation definition",
	["operationType", _operationType],
	["name", optional(_name)],
	["variableDefinitions", _variableDefinitions],
	["directives", many0(_directive)],
	["selectionSet", _selectionSet]);

const _fragmentDefinition = node("fragment definition",
	["open", string("fragment")],
	["fragmentName", _fragmentName],
	["typeCondition", _typeCondition],
	["directives", many0(_directive)],
	["selectionSet", _selectionSet]);

const _definition = node("definition",
	["value", alt(_selectionSet, _operationDefinition, _fragmentDefinition)]);

const _document = node("document",
	["definitions", cut("definitions", many1(_definition))]);

/*
TODOs:
 - parse case of 1 thing in document -- suddenly doesn't need query/mutation keyword or name or something
 - unions, interfaces, extends, class/type declarations
 - cuts everywhere?
 - token munching -- best way to do this?
 - consistent names
 - exports, names that don't start with _
*/

function parse(text) {
	return tokens.parse(text, [1, 1]);
}

module.exports = {
	'parse': parse
};
