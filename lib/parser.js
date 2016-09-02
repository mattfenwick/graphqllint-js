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

// Ignored

const _unicodeBOM = literal("\uFEFF");

const _whitespace = oneOf("\t ");

const _newline = alt(literal("\n"), string("\r\n"), literal("\r"));

const _comment = node("comment",
	["open", literal("#")],
	["rest", many0(not1(_newline))]);

const _comma = literal(",");

const ignored = alt(_whitespace, _newline, _comment, _comma, _unicodeBOM);

// tokens part 1

const _lowercase = oneOf("abcdefghijklmnopqrstuvwxyz");
const _uppercase = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _nonzerodigit =  oneOf("123456789")
const _digit        = oneOf("0123456789");

const _name = node('name',
	["first", alt(_lowercase, _uppercase, literal("_"))],
	["rest", many0(alt(_digit, _lowercase, _uppercase, literal("_")))]);

const _zero = node("zero",
	["first", literal("0")],
	["rest", pure([])]); // to match integer's schema

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

const _plainChar = node("plainChar",
	["char", not1(oneOf("\"\\"))]);

const _hex = oneOf('0123456789abcdefABCDEF');

const _unicodeEscape = node("unicodeEscape",
	["open", string("\\u")],
	["value", cut("hex digits", quantity(_hex, 4))]);

const _simpleEscape = node("simpleEscape",
	["open", literal("\\")],
	["char", cut("char", oneOf('"\\/bfnrt'))]);

const _string = node("string",
	["open", literal('"')],
	["body", many0(alt(_plainChar, _unicodeEscape, _simpleEscape))],
	["close", cut("close", literal('"'))]);

const _boolean = node("boolean",
	["value", alt(string("true"), string("false"))]);

const _disallowedEnumValues = {'true': 1, 'false': 1, 'null': 1};
const _enum = node("enum",
	["value", check((node) => {
		const name = node.first + node.rest.join('');
		return !_disallowedEnumValues.hasOwnProperty(name);
	}, _name)]);

const _variable = node("variable",
	["open", literal("$")],
	["name", cut("name", _name)]);

const _directiveName = node("directiveName",
	["open", literal("@")],
	["name", cut("name", _name)]);

// munched tokens

function munch(parser) {
	return seq2L(parser, many0(ignored));
}

const name        = munch(_name);
const gql_string  = munch(_string);
const number      = munch(_number);
const gql_boolean = munch(_boolean);
const gql_enum    = munch(_enum);

const variable    = munch(_variable);
const directiveName = munch(_directiveName);

const opType      = munch(alt(string("query"), string("mutation")));
const fragment    = munch(string("fragment"));
const on          = munch(string("on"));

const bang        = munch(literal("!"));
const splat       = munch(string("..."));
const colon       = munch(literal(":"));
const eq          = munch(literal("="));

const op          = munch(literal("("));
const cp          = munch(literal(")"));
const os          = munch(literal("["));
const cs          = munch(literal("]"));
const oc          = munch(literal("{"));
const cc          = munch(literal("}"));

// types, arguments and values

const namedType = node("namedType",
	["type", name]);

// forward declarations
const type = error("undefined");
const value = error("undefined");

const listType = node("listType",
	["open", os],
	["type", cut("type", type)],
	["close", cut("]", cs)]);

type.parse = node("type",
	["base type", alt(namedType, listType)],
	["bang", optional(bang)]).parse;

const argument = node("argument",
	["name", name],
	[":", colon],
	["value", value]);

const gql_arguments = node("arguments",
	["open", op],
	["arguments", cut("1 or more arguments", many1(argument))],
	["close", cut(")", cp)]);

const directive = node("directive",
	["name", directiveName],
	["arguments", optional(gql_arguments)]);

const list = node("list",
	["open", os],
	["values", many0(value)],
	["close", cut("]", cs)]);

const object = node("object",
	["open", oc],
	["keyvals", many0(argument)],
	["close", cut("}", cc)]);

value.parse = alt(number, gql_string, gql_boolean, gql_enum, list, object, variable).parse;

const fragmentName = node("fragmentName",
	["name", check((node) => {
		const name = node.first + node.rest.join('');
		return name !== "on";
	}, name)]);

// Query Document

// forward declarations
const selectionSet = error("undefined");

const alias = node("alias",
	["name", name],
	[":", colon]);

const field = node("field",
	["alias", optional(alias)],
	["name", name],
	["arguments", optional(gql_arguments)],
	["directives", many0(directive)],
	["selectionSet", optional(selectionSet)]);

const fragmentSpread = node("fragmentSpread",
	["splat", splat],
	["fragmentName", fragmentName], // TODO can this be cut?  does fragmentSpread need to be combined with inlineFragment in order to cut?
	["directives", many0(directive)]);

const typeCondition = node("typeCondition",
	["open", on],
	["type", namedType]);

const inlineFragment = node("inlineFragment",
	["splat", splat],
	["typeCondition", optional(typeCondition)],
	["directives", many0(directive)],
	["selectionSet", selectionSet]);

const selection = node("selection",
	["value", alt(field, fragmentSpread, inlineFragment)]);

selectionSet.parse = node("selectionSet",
	["open", oc],
	["selections", cut("1 or more Selections", many1(selection))],
	["close", cut("}", cc)]).parse;

const operationType = node("operation type",
	["type", opType]);

const defaultValue = node("default value",
	["open", eq],
	["value", cut("value", value)]);

const variableDefinition = node("variableDefinition",
	["variable", variable],
	[":", colon], // TODO cut?
	["type", cut("type", type)],
	["defaultValue", optional(defaultValue)]); // TODO note: the value must not contain variables anywhere

const variableDefinitions = node("variableDefinitions",
	["open", op],
	["definitions", cut("1 or more definitions", many1(variableDefinition))],
	["close", cut(")", cp)]);

const operationDefinition = node("operationDefinition",
	["operationType", operationType],
	["name", optional(name)],
	["variableDefinitions", optional(variableDefinitions)],
	["directives", many0(directive)],
	["selectionSet", selectionSet]); // TODO cut?

const fragmentDefinition = node("fragmentDefinition",
	["open", fragment],
	["fragmentName", cut("fragment name", fragmentName)],
	["typeCondition", cut("type condition", typeCondition)],
	["directives", many0(directive)],
	["selectionSet", cut("selection set", selectionSet)]);

const definition = node("definition",
	["value", alt(selectionSet, operationDefinition, fragmentDefinition)]);

const document = node("document",
	["definitions", cut("1 or more definitions", many1(definition))]);

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
	return document.parse(text, [1, 1]);
}

module.exports = {
	'parse': parse,
	
	'document'  : document,
	'definition': definition,
	'value'     : value,
	'ignored'   : ignored,
	'number'    : number,
	'selectionSet': selectionSet
};
