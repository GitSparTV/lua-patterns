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

print = console.log
// print = function() {}

class Token {
	constructor(tk, str) {
		this.type = TokToStr[tk]
		this.string = str
	}
}

class Lexer {
	constructor(str) {
		this.input = str
		this.end = str.length
		this.len = str.length - 1
		this.tokens = []
		this.current = ""
		this.caret = -1
		this.rem = null
	}

	Next() {
		this.current = this.input.charAt(++this.caret)
	}

	Lookahead() {
		return this.input.charAt(this.caret)
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
		return this.caret == this.len
	}

	Remember() {
		this.rem = this.caret
	}

	Remind() {
		return this.rem
	}

	AddToken(type, info) {
		this.tokens.push(new Token(type, info))
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
	lex.Next()
	if (MatchClass(lex.current)) {
		lex.AddToken(TOK.CLASS, lex.current)
	} else {
		lex.AddToken(TOK.ESCAPED, lex.current)
	}
}

function ReadSet(lex) {
	lex.AddToken(TOK.LBRACKET)
	lex.Next()
	if (lex.CheckNext("^")) lex.AddToken(TOK.INVERSE);
	do {
		if (lex.IsEnd()) throw new Error("malformed pattern (missing ']')")
		if (lex.current == "%" && lex.caret < lex.end) {
			ReadEscape(lex)
		} else {
			if (lex.Lookahead() == "-") {

			}
		}
		lex.Next()
	} while (lex.current != "]")
	lex.AddToken(TOK.RBRACKET)
	lex.Next()
}

function ParsePattern(input) {
	let lex = new Lexer(input)
	lex.Next()
	if (lex.current == "^") {
		lex.AddToken(TOK.START)
		lex.Next()
	}
	print("Str", input)
	print("Len", input.length)
	let error
	try {
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
					print("%")
					ReadEscape(lex)
				break
				case "[":
					print("[")
					ReadSet(lex)
					ReadQuantity(lex)
				break
				default:
					print("default", lex.current)
					lex.AddToken(TOK.CHAR, lex.current)
					lex.Next()
					ReadQuantity(lex)
				break
			}
		}
	}
	catch (e) {
		print(e.name + ": " + e.message)
		error = e.name + ": " + e.message
	}

	console.log(lex.tokens)

	for (const token of lex.tokens) {

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
}

ParsePattern("[^abc%]%a]+")