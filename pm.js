const TOK = Object.freeze({
	START: 0, // ^
	END: 1, // $
	ANY: 2, // .
	ZEROORMORE: 3, // *
	ONEORMORE: 4, // +
	ZEROORMORELAZY: 5, // -
	ZEROORONE: 6, // ?
	CHAR: 7, // literal
	LPAR: 8, // (
	RPAR: 9, // )
	ESCAPED: 10, // %escaped
	LBRACKET: 11, // [
	RBRACKET: 12, // ]
	INVERSE: 13, // ^ in set
	CLASS: 14, // %class
	CAPTUREREF: 15, // %1
	BALANCED: 16, // %b
	FRONTIER: 17, // %f
	ERROR: 18, // error
})
const TokToStr = [
	"START",
	"END",
	"ANY",
	"ZEROORMORE",
	"ONEORMORE",
	"ZEROORMORELAZY",
	"ZEROORONE",
	"CHAR",
	"LPAR",
	"RPAR",
	"ESCAPED",
	"LBRACKET",
	"RBRACKET",
	"INVERSE",
	"CLASS",
	"CAPTUREREF",
	"BALANCED",
	"FRONTIER",
]

// print = console.log
print = function() {}

class Token {
	constructor(tk, str) {
		this.type = tk
		this.string = str
	}
}

class Lexer {
	constructor(str) {
		this.input = str
		this.end = str.length
		this.last = str.length - 1
		this.tokens = []
		this.current = str.charAt(0)
		this.caret = 0
	}

	Next() {
		this.current = this.input.charAt(++this.caret)
	}

	Lookahead() {
		return this.input.charAt(this.caret+1)
	}

	CheckNext(char) {
		if (this.current == char) {
			this.Next()
			return true
		}
		return false
	}

	IsEnd() {
		return this.caret >= this.end
	}

	IsLast() {
		return this.caret == this.last
	}

	AddToken(type, info) {
		this.tokens.push(new Token(type, info))
	}

	Sub(a, b) {
		return this.input.substring(a, b)
	}
}

function MatchClass(char) {
	switch (char.toLowerCase()) {
		case 'a': return true;
		case 'c': return true;
		case 'd': return true;
		case 'g': return true;
		case 'l': return true;
		case 'L': return true;
		case 'p': return true;
		case 's': return true;
		case 'S': return true;
		case 'u': return true;
		case 'w': return true;
		case 'x': return true;
		case 'z': return true;
		default: return false;
	}
}

function ReadQuantity(lex) {
	switch (lex.current) {
		case "+":
			lex.AddToken(TOK.ONEORMORE)
			lex.Next()
		break
		case "-":
			lex.AddToken(TOK.ZEROORMORELAZY)
			lex.Next()
		break
		case "*":
			lex.AddToken(TOK.ZEROORMORE)
			lex.Next()
		break
		case "?":
			lex.AddToken(TOK.ZEROORONE)
			lex.Next()
		break
	}
}

function ReadEscape(lex) {
	if (lex.IsLast()) throw new Error("malformed pattern (ends with '%')")
	if (MatchClass(lex.current)) {
		lex.AddToken(TOK.CLASS, lex.current)
	} else {
		lex.AddToken(TOK.ESCAPED, lex.current)
	}
	lex.Next()
}

function ReadSet(lex) {
	lex.AddToken(TOK.LBRACKET)
	lex.Next()
	if (lex.CheckNext("^")) lex.AddToken(TOK.INVERSE);
	do {
		if (lex.IsEnd()) throw new Error("malformed pattern (missing ']')")
		if (lex.current == "%" && lex.caret < lex.end) {
			lex.Next()
			ReadEscape(lex)
		} else {
			lex.AddToken(TOK.CHAR, lex.current)
			lex.Next()
		}
	} while (lex.current != "]")
	lex.AddToken(TOK.RBRACKET)
	lex.Next()
}

function PatternsLex(input) {
	const lex = new Lexer(input)
	try {
		if (lex.CheckNext("^")) {
			lex.AddToken(TOK.START)
		}
		print("Str", input)
		print("Len", input.length)
		while (!lex.IsEnd()) {
			switch (lex.current) {
				case "(":
					print("(")
					lex.AddToken(TOK.LPAR)
					lex.Next()
				break
				case ")":
					print(")")
					lex.AddToken(TOK.RPAR)
					lex.Next()
				break
				case "$":
					print("$")
					if (lex.IsLast()) {
						lex.AddToken(TOK.END)
						lex.Next()
					} else {
						lex.AddToken(TOK.CHAR, lex.current)
						lex.Next()
						ReadQuantity(lex)
					}
				break
				case "%":
					lex.Next()
					print("%", lex.current)
					switch (lex.current) {
						case "b":
							if (lex.caret + 2 >= lex.end) throw new Error("malformed pattern (missing arguments to '%b')");
							lex.AddToken(TOK.BALANCED, lex.Sub(lex.caret + 1, lex.caret + 3))
							lex.Next()
							lex.Next()
							lex.Next()
						break
						case "f":
							lex.Next()
							if (lex.current != "[") throw new Error("missing '[' after '%f' in pattern");
							lex.AddToken(TOK.FRONTIER)
							ReadSet(lex)
						break
						case '0': case '1': case '2': case '3':
						case '4': case '5': case '6': case '7':
						case '8': case '9':
							lex.AddToken(TOK.CAPTUREREF,lex.current)
							lex.Next()
						break
						default:
							ReadEscape(lex)
							ReadQuantity(lex)
						break
					}
				break
				case "[":
					print("[")
					ReadSet(lex)
					ReadQuantity(lex)
				break
				case ".":
					print(".")
					lex.AddToken(TOK.ANY)
					lex.Next()
					ReadQuantity(lex)
				break
				default:
					print("char", lex.current)
					lex.AddToken(TOK.CHAR, lex.current)
					lex.Next()
					ReadQuantity(lex)
				break
			}
		}
	}
	catch (e) {
		print(e.name + ": " + e.message)
		lex.AddToken(TOK.ERROR, e.name + ": " + e.message)
	}

	return lex.tokens
}

class Parser {
	constructor(tokens) {
		this.tokens = tokens
		this.caret = 0
		this.last = tokens.length - 1
		this.end = tokens.length
		this.current = tokens[0]
		this.nodes = []
		this.rem = null
	}

	Next() {
		this.current = this.tokens[++this.caret]
	}

	IsNextQuanifier(type) {
		if (this.IsLast()) return false

		let token = this.tokens[this.caret + 1]
		switch (token.type) {
			case TOK.ZEROORMORE: case TOK.ONEORMORE: case TOK.ZEROORMORELAZY: case TOK.ZEROORONE:
				return true
			default:
				return false
		}
	}

	Remember() {
		this.rem = this.caret
	}

	GoBack() {
		this.caret = this.rem + 1
		this.current = this.tokens[this.rem]
	}

	Add(node) {
		this.nodes.push(node)
	}

	IsEnd() {
		return this.caret >= this.end
	}

	IsLast() {
		return this.caret == this.last
	}
}

const PAT = Object.freeze({
	ERROR: 0,
	CHARS: 1,
	QUANTIFIER: 2,
	ANY: 3,
	START: 4,
	END: 5,
	ESCAPED: 6,
	CLASS: 7,
	CAPTUREREF: 8,
	BALANCED: 9,
})
const PatToStr = [
	"ERROR",
	"CHARS",
	"QUANTIFIER",
	"ANY",
	"START",
	"END",
	"ESCAPED",
	"CLASS",
	"CAPTUREREF",
	"BALANCED",
]

class PatternObject {
	constructor(type, parent, text) {
		this.type = PatToStr[type]
		this.text = text
		this.children = []
		parent.Add(this)
	}

	Add(child) {
		this.children.push(child)
	}
}

function CheckQuanitifier(par, parent) {
	if (par.IsEnd()) return
	switch (par.current.type) {
		case TOK.ZEROORMORE: case TOK.ONEORMORE: case TOK.ZEROORMORELAZY: case TOK.ZEROORONE:
			new PatternObject(PAT.QUANTIFIER, parent, par.current.type)
			par.Next()
			return true
		default:
			return
	}
}

function MakeString(par) {
	let string = new PatternObject(PAT.CHARS, par, "")
	do {
		string.text += par.current.string
		par.Next()
	} while (!par.IsEnd() && par.current.type == TOK.CHAR && !par.IsNextQuanifier())

	CheckQuanitifier(par, string)
}

function PatternsParse(tokens) {
	// console.log(tokens)
	const par = new Parser(tokens)
	while (!par.IsEnd()) {
		switch (par.current.type) {
			case TOK.START:
				{
					console.log("^")
					new PatternObject(PAT.START, par)
					par.Next()
				}
			break
			case TOK.END:
				{
					console.log("$")
					new PatternObject(PAT.END, par)
					par.Next()
				}
			break
			case TOK.ANY:
				{
					console.log(".")
					let obj = new PatternObject(PAT.ANY, par)
					par.Next()
					CheckQuanitifier(par, obj)
				}
			break
			case TOK.CHAR:
				{
					console.log("char")
					MakeString(par)
				}
			break
			// case TOK.LPAR:

			// break
			// case TOK.RPAR:

			// break
			case TOK.ESCAPED:
				{
					console.log("escaped")
					let obj = new PatternObject(PAT.ESCAPED, par)
					par.Next()
					CheckQuanitifier(par, obj)
				}
			break
			case TOK.LBRACKET:
				{
					console.log("braket")
					par.Next()
				}
			break
			case TOK.CLASS:
				{
					console.log("class")
					let obj = new PatternObject(PAT.CLASS, par)
					par.Next()
					CheckQuanitifier(par, obj)
				}
			break
			case TOK.CAPTUREREF:
				{
					console.log("Captureref")
					let obj = new PatternObject(PAT.CAPTUREREF, par)
					par.Next()
				}
			break
			case TOK.BALANCED:
				{
					console.log("balanced")
					let obj = new PatternObject(PAT.BALANCED, par)
					par.Next()
				}
			break
			// case TOK.FRONTIER:
				// {

				// }
			// break
			case TOK.ERROR:
				{
					console.log("Error")
					par.Add()
					par.Next()
				}
			break
			default:
				{
					console.log("unknown", par.current)
					par.Next()
				}
			break
		}
	}

	return par.nodes
}

function PatternsPrint(input) {
	const tokens = PatternsLex(input)
	const output = PatternsParse(tokens)
	console.log(output)
	// for (let node of output) {

	// }
}

	// const result = document.getElementById('result');
	// while (result.firstChild) {
	// 	result.removeChild(result.firstChild);
	// }

	// for (const token of Tokens) {
	// 	let element = document.createElement("div");
	// 	let p = document.createElement("a")
	// 	p.className = "input"
	// 	let name = document.createElement("a")
	// 	name.className = "name"
	// 	let description = document.createElement("a")
	// 	description.className = "description"
	// 	element.className = "token"
	// 	if (token.type == TOK.CHAR) {
	// 		p.appendChild(document.createTextNode(token.string))
	// 		name.appendChild(document.createTextNode("Character."))
	// 		description.appendChild(document.createTextNode("Matches literal character."))
	// 		element.id = "char"
	// 	} else {
	// 		p.appendChild(document.createTextNode((token.string ? "[" + (token.string) + "] " : "") + TokToStr[token.type]))
	// 		element.id = "token"
	// 	}
	// 	element.appendChild(p)
	// 	element.appendChild(name)
	// 	element.appendChild(description)
	// 	result.appendChild(element)
	// }

	// if (error) {
	// 	let element = document.createElement("div");
	// 	element.className = "error"
	// 	element.appendChild(document.createTextNode(error))
	// 	result.appendChild(element)
	// }
// "^^abc[set]+q+w*e-r?%((t.)%)%b()%f[^a-zA-Z%s]%1$$"
PatternsPrint("^^abc[set]+q+w*e-r?%((t.)%)%b()%f[^a-zA-Z%s]%1$$")
/*
^					+
^					+
a					+
b					+
c					+
[					+
	s				+
	e				+
	t				+
]					+
	+				+
q					+
	+				+
w					+
	*				+
e					+
	-				+
r					+
	?				+
%(					+
(					+
	t				+
	.				-
)					+
%)					+
%b()				+
%f					+
	[				+
		^			+
		a			+
		-			+
		z			+
		A			+
		-			+
		Z			+
		%s			+
	]				
%1					
$					
$					
*/