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
    many1 = C.many1, seq   = C.seq,  alt   = C.alt,
    seq2L = C.seq2L, not0  = C.not0, error = C.error,
    bind  = C.bind , sepBy0  = C.sepBy0;

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
						["char", not1(oneOf("\"\\"))])
const _hex = oneOf('0123456789abcdefABCDEF')
const _unicodeEscape = node("unicode escape",
							["open", string("\\u")],
							["value", cut("hex digits", quantity(_hex, 4))])
const _simpleEscape = node("simple escape",
							["open", literal("\\")],
							["char", cut("char", oneOf('"\\/bfnrt'))])
const _string = node("string",
						["open", literal('"')],
						["body", many0(alt(_plainChar, _unicodeEscape, _simpleEscape))],
						["close", cut("close", literal('"'))])

const _token = alt(_string, _number, _name)

const tokens = seq2R(ignored, many0(seq2L(_token, ignored)))



function parse(text) {
	return tokens.parse(text, [1, 1]);
}

module.exports = {
	'parse': parse
};
