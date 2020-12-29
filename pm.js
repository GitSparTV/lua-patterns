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
print = function () { }

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
		return this.input.charAt(this.caret + 1)
	}

	CheckNext(char) {
		if (this.current === char) {
			this.Next()
			return true
		}
		return false
	}

	IsEnd() {
		return this.caret >= this.end
	}

	IsLast() {
		return this.caret === this.last
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
		case 'a': case 'c': case 'd': case 'g': case 'l':
		case 'p': case 's': case 'u': case 'w': case 'x': case 'z':
			return true;
		default:
			return false;
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
	if (lex.IsEnd()) { lex.AddToken(TOK.ERROR, "Unfinished escape. Finish \"%\" with class or escape character or use \"%%\" to match \"%\" as character."); throw new Error("") }
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
		if (lex.IsEnd()) { lex.AddToken(TOK.ERROR, "Missing \"]\" to close set."); throw new Error("") }
		if (lex.current === "%" && lex.caret < lex.end) {
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
							if (lex.caret + 2 >= lex.end) { lex.AddToken(TOK.ERROR, "Missing characters for \"%b\" pattern. Example: \"%b()\"."); throw new Error(""); }
							lex.AddToken(TOK.BALANCED, lex.Sub(lex.caret + 1, lex.caret + 3))
							lex.Next()
							lex.Next()
							lex.Next()
							break
						case "f":
							lex.Next()
							if (lex.current != "[") { lex.AddToken(TOK.ERROR, "Missing \"[\" after \"%f\" in pattern. Example: \"%f[%w]\"."); throw new Error(""); }
							lex.AddToken(TOK.FRONTIER)
							ReadSet(lex)
							break
						case '0': case '1': case '2': case '3':
						case '4': case '5': case '6': case '7':
						case '8': case '9':
							lex.AddToken(TOK.CAPTUREREF, lex.current)
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
		if (e.message.length > 0) {
			print(e.name + ": " + e.message)
			lex.AddToken(TOK.ERROR, "Lexer error: " + e.message)
		}
	}

	return lex.tokens
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
	SET: 10,
	CAPTURE: 11,
	FRONTIER: 12,
	RANGE: 13,
	INVERSESET: 14,
	POSITION: 15,
	WARNING: 16,
	NOTE: 17,
	SETCHARS: 18,
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
	"SET",
	"CAPTURE",
	"FRONTIER",
	"RANGE",
	"INVERSESET",
	"POSITION",
	"WARNING",
	"NOTE",
	"SETCHARS",
]

class Parser {
	constructor(tokens) {
		this.tokens = tokens
		this.caret = 0
		this.last = tokens.length - 1
		this.end = tokens.length
		this.current = tokens[0]
		this.nodes = []
		this.levels = []
		this.captures = []
		this.rem = null
	}

	Next() {
		this.current = this.tokens[++this.caret]
	}

	IsNextQuantifier(type) {
		if (this.IsLast()) return false

		let token = this.tokens[this.caret + 1]
		switch (token.type) {
			case TOK.ZEROORMORE: case TOK.ONEORMORE: case TOK.ZEROORMORELAZY: case TOK.ZEROORONE:
				return true
			default:
				return false
		}
	}

	IsNextRange() {
		if (this.caret + 2 >= this.end) return false

		let token = this.tokens[this.caret + 1]
		let token2 = this.tokens[this.caret + 2]

		if (token.type === TOK.CHAR && token.string === "-" && token2.type === TOK.CHAR) return true

		return false
	}

	IsNextRPar() {
		if (this.IsLast()) return false
		return this.tokens[this.caret + 1].type === TOK.RPAR
	}

	Add(node) {
		if (this.levels.length === 0) {
			this.nodes.push(node)
		} else {
			this.levels[this.levels.length - 1].Add(node)
		}
	}

	StartCapture() {
		let capture = new PatternObject(PAT.CAPTURE, this, this.captures.length + 1)
		this.captures.push(capture)
		this.levels.push(capture)
	}

	EndCapture() {
		this.levels.pop()
	}

	IsEnd() {
		return this.caret >= this.end
	}

	IsLast() {
		return this.caret === this.last
	}
}

class PatternObject {
	constructor(type, parent, text) {
		this.type = type
		this.text = text
		this.children = []
		parent.Add(this)
	}

	Add(child) {
		this.children.push(child)
	}
}

function CheckQuantifier(par, parent) {
	if (par.IsEnd()) return
	switch (par.current.type) {
		case TOK.ZEROORMORE: case TOK.ONEORMORE: case TOK.ZEROORMORELAZY: case TOK.ZEROORONE:
			new PatternObject(PAT.QUANTIFIER, parent, par.current.type)
			if (parent.type === PAT.CHARS && parent.text.charCodeAt(0) > 255) new PatternObject(PAT.WARNING, parent, "Character \"" + parent.text + "\" (" + parent.text.charCodeAt(0) + ") is outside ASCII range. It will be interpreted incorrectly (as separate parts of the symbol).")
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
	} while (!par.IsEnd() && par.current.type === TOK.CHAR && !par.IsNextQuantifier())

	CheckQuantifier(par, string)
}

function MakeSet(par, parent) {
	let set
	par.Next()
	if (par.current.type === TOK.INVERSE) { set = new PatternObject(PAT.INVERSESET, parent ? parent : par); par.Next() } else { set = new PatternObject(PAT.SET, parent ? parent : par) }

	do {
		switch (par.current.type) {
			case TOK.CLASS:
				new PatternObject(PAT.CLASS, set, par.current.string)
				par.Next()
				break
			case TOK.CHAR:
				if (par.IsNextRange()) {
					let string = par.current.string
					par.Next()
					par.Next()
					new PatternObject(PAT.RANGE, set, string + par.current.string)
					if (string.charCodeAt(0) > 255 || par.current.string.charCodeAt(0) > 255) new PatternObject(PAT.WARNING, set, "Range \"" + string + "\" (" + string.charCodeAt(0) + ") - \"" + par.current.string + "\" (" + par.current.string.charCodeAt(0) + ") is outside ASCII range. It will be interpreted incorrectly (as separate parts of the symbol).")
					par.Next()
				} else {
					let string = new PatternObject(PAT.SETCHARS, set, par.current.string)
					if (par.current.string.charCodeAt(0) > 255) new PatternObject(PAT.WARNING, set, "Character \"" + par.current.string + "\" (" + par.current.string.charCodeAt(0) + ") is outside ASCII range. It will be interpreted incorrectly (as separate parts of the symbol).")
					par.Next()
				}
				break
			case TOK.ESCAPED:
				new PatternObject(PAT.ESCAPED, set, par.current.string)
				if (par.current.string.charCodeAt(0) > 255) new PatternObject(PAT.WARNING, set, "Character \"" + par.current.string + "\" (" + par.current.string.charCodeAt(0) + ") is outside ASCII range. It will be interpreted incorrectly (as separate parts of the symbol).")
				par.Next()
				break
			case TOK.ERROR:
				new PatternObject(PAT.ERROR, set, par.current.string)
				par.Next()
				return
			default:
				console.log("???", par.current.type)
				par.Next()
				break
		}
	} while (par.current.type != TOK.RBRACKET)
	par.Next()

	CheckQuantifier(par, set)
}

function PatternsParse(tokens) {
	const par = new Parser(tokens)
	try {
		while (!par.IsEnd()) {
			switch (par.current.type) {
				case TOK.ANY:
					{
						print(".")
						let obj = new PatternObject(PAT.ANY, par)
						par.Next()
						CheckQuantifier(par, obj)
						if (obj.children[0] && obj.children[0].type === PAT.QUANTIFIER && (obj.children[0].text === TOK.ZEROORMORE || obj.children[0].text === TOK.ONEORMORE)) {
							new PatternObject(PAT.NOTE, obj, "Matching any characters with \"+\" or \"*\" quantifiers may fail your pattern. They match the longest sequence, meaning anything after this pattern won't be matched.")
						}
					}
					break
				case TOK.CHAR:
					{
						print("char")
						MakeString(par)
					}
					break
				case TOK.ESCAPED:
					{
						print("escaped")
						let obj = new PatternObject(PAT.ESCAPED, par, par.current.string)
						if (par.current.string.charCodeAt(0) > 255) new PatternObject(PAT.WARNING, obj, "Character \"" + par.current.string + "\" (" + par.current.string.charCodeAt(0) + ") is outside ASCII range. It will be interpreted incorrectly (as separate parts of the symbol).")
						par.Next()
						CheckQuantifier(par, obj)
					}
					break
				case TOK.LBRACKET:
					{
						print("[")
						MakeSet(par)
					}
					break
				case TOK.CLASS:
					{
						print("class")
						let obj = new PatternObject(PAT.CLASS, par, par.current.string)
						par.Next()
						CheckQuantifier(par, obj)
					}
					break
				case TOK.LPAR:
					{
						print("(")
						if (par.IsNextRPar()) {
							par.captures.push(new PatternObject(PAT.POSITION, par, par.captures.length + 1))
							par.Next()
							par.Next()
						} else {
							par.StartCapture()
						}
						par.Next()
					}
					break
				case TOK.RPAR:
					{
						print(")")
						par.EndCapture()
						par.Next()
					}
					break
				case TOK.CAPTUREREF:
					{
						print("Captureref")
						let obj = new PatternObject(PAT.CAPTUREREF, par, par.current.string)
						if (par.current.string === "0") {
							new PatternObject(PAT.NOTE, obj, "Reference for capture #0 is available only in string.gsub.")
						} else if (par.captures.length < par.current.string) {
							new PatternObject(PAT.WARNING, obj, "Reference for capture #" + par.current.string + " is not found.")
						} else if (par.captures[par.current.string - 1].type === PAT.POSITION) {
							new PatternObject(PAT.NOTE, obj, "References for position captures are available only in string.gsub.")
						}
						par.Next()
					}
					break
				case TOK.BALANCED:
					{
						print("balanced")
						new PatternObject(PAT.BALANCED, par, par.current.string)
						par.Next()
					}
					break
				case TOK.FRONTIER:
					{
						print("%f")
						let f = new PatternObject(PAT.FRONTIER, par)
						par.Next()
						MakeSet(par, f)
					}
					break
				case TOK.ERROR:
					{
						new PatternObject(PAT.ERROR, par, par.current.string)
						par.Next()
					}
					break
				case TOK.START:
					{
						print("^")
						new PatternObject(PAT.START, par)
						par.Next()
					}
					break
				case TOK.END:
					{
						print("$")
						new PatternObject(PAT.END, par)
						par.Next()
					}
					break
				default:
					{
						print("unknown", par.current)
						new PatternObject(PAT.ERROR, par, "Unknown pattern, check console.")
						par.Next()
					}
					break
			}
		}
		if (par.levels.length != 0) throw new Error("Unfinished capture #" + par.captures.length + ". \")\" is missing.")
	} catch (e) {
		console.log(e.name + ": " + e.message)
		par.levels.length = 0
		new PatternObject(PAT.ERROR, par, "Parser error: " + e.message)
	}

	return par.nodes
}

let basediv = null
function CreateDiv(type, parent, text, name, description) {
	let element = document.createElement("div");
	let p = document.createElement("a")
	p.className = "input"
	p.appendChild(document.createTextNode(text))
	let nname = document.createElement("a")
	nname.className = "name"
	nname.appendChild(document.createTextNode(name))
	let ndescription = document.createElement("a")
	ndescription.className = "description"
	ndescription.appendChild(document.createTextNode(description))
	element.classList.add("token", ...type.split(" "))
	element.appendChild(p)
	element.appendChild(nname)
	element.appendChild(ndescription)
	parent.appendChild(element)

	return element
}

function CleanBaseDiv() {
	while (basediv.firstChild) {
		basediv.removeChild(basediv.firstChild)
	}
}

const PAT_QUANTIFIER_NAMES = Object.freeze({
	[TOK.ZEROORMORE]: ["*", "zero or more", "Allows to match the pattern zero or more times. This will match the longest sequence."],
	[TOK.ONEORMORE]: ["+", "one or more", "Allows to match the pattern one or more times. This will match the longest sequence."],
	[TOK.ZEROORMORELAZY]: ["-", "lazy zero or more", "Allows to match the pattern zero or more times. This will match the shortest sequence."],
	[TOK.ZEROORONE]: ["?", "zero or one", "Allows to match the pattern zero or one time."],
})

const PAT_CLASS_NAMES = Object.freeze({
	["a"]: ["Letters", "all letters (Equivalent to [a-zA-Z])"],
	["A"]: ["Not letters", "all non-letters (Equivalent to [^a-zA-Z])"],
	["c"]: ["Controls", "all control characters (Such as \"\\t\", \"\\n\", \"\\r\", etc.) (Equivalent to [\\0-\\31])"],
	["C"]: ["Not Controls", "all non-control characters (Equivalent to [^\\0-\\31])"],
	["d"]: ["Digits", "all digits (Equivalent to [0-9])"],
	["D"]: ["Not digits", "all non-digits (Equivalent to [^0-9])"],
	["g"]: ["Printable", "all printable characters except space (Equivalent to [\\33-\\126])"],
	["G"]: ["Not printable", "all non-printable characters including space (Equivalent to [^\\33-\\126])"],
	["l"]: ["Lowercase", "all lowercase letters (Equivalent to [a-z])"],
	["L"]: ["Not lowercase", "all non-lowercase letters (Equivalent to [^a-z])"],
	["p"]: ["Punctuations", "all punctuation characters (Equivalent to [!\"#$%&'()*+,-./[\\%]^_`{|}~])"],
	["P"]: ["Not punctuations", "all non-punctuation characters (Equivalent to [^!\"#$%&'()*+,-./[\\%]^_`{|}~])"],
	["s"]: ["Spaces", "all white-space characters (Equivalent to [ \\t\\n\\v\\f\\r])"],
	["S"]: ["Not spaces", "all non-white-space characters (Equivalent to [^ \\t\\n\\v\\f\\r])"],
	["u"]: ["Uppercase", "all uppercase letters (Equivalent to [A-Z])"],
	["U"]: ["Not uppercase", "all non-uppercase letters (Equivalent to [^A-Z])"],
	["w"]: ["Alphanumerics", "all digits, lowercase and uppercase letters (Equivalent to [a-zA-Z0-9])"],
	["W"]: ["Not alphanumerics", "all non-digits, non-lowercase and non-uppercase letters (Equivalent to [^a-zA-Z0-9])"],
	["x"]: ["Hexadecimals", "all hexadecimal digits (Equivalent to [0-9a-fA-F]"],
	["X"]: ["Not hexadecimals", "all non-hexadecimal digits (Equivalent to [^0-9a-fA-F]"],
	["z"]: ["\\0 byte", "NULL character (0). Deprecated in Lua 5.2.0, use \"\\0\" as regular character."],
	["Z"]: ["Not \\0 byte", "non-NULL character (0). Deprecated in Lua 5.2.0, use \"[^\\0]\" as regular character."],
})

function PatternsShow(nodes, parent) {
	try {
		for (let node of nodes) {
			switch (node.type) {
				case PAT.CHARS:
					{
						let len = node.text.length
						let element = CreateDiv("char", parent, node.text, len > 1 ? "Characters." : "Character.", len > 1 ? ("Matches the characters \"" + node.text + "\" literally.") : ("Matches the character \"" + node.text + "\" literally."))
						PatternsShow(node.children, element)
					}
					break
				case PAT.SETCHARS:
					{
						let len = node.text.length
						let element = CreateDiv("char", parent, node.text, "Character.", (parent.classList.contains("inverse") ? "Doesn't match \"" : "Matches \"") + node.text + "\" literally.")
						PatternsShow(node.children, element)
					}
					break
				case PAT.QUANTIFIER:
					{
						let element = CreateDiv("quantifier", parent, PAT_QUANTIFIER_NAMES[node.text][0], "Quantifier (" + PAT_QUANTIFIER_NAMES[node.text][1] + ").", PAT_QUANTIFIER_NAMES[node.text][2])
						PatternsShow(node.children, element)
					}
					break
				case PAT.ANY:
					{
						let element = CreateDiv("any", parent, ".", "Any.", "Matches any character. Equivalent to \"[%s%S]\".")
						PatternsShow(node.children, element)
					}
					break
				case PAT.ESCAPED:
					{
						let element = CreateDiv("char", parent, "%" + node.text, "Escaped character.", "Matches the character \"" + node.text + "\" literally.")
						if (parent === basediv) { PatternsShow(node.children, element) }
					}
					break
				case PAT.CLASS:
					{
						let element = CreateDiv("class", parent, "%" + node.text, "Class (" + PAT_CLASS_NAMES[node.text][0] + ").", "Matches " + PAT_CLASS_NAMES[node.text][1] + ".")
						if (parent === basediv) { PatternsShow(node.children, element) }
					}
					break
				case PAT.CAPTUREREF:
					{
						let element = CreateDiv("captureref", parent, "%" + node.text, "Capture reference.", "Matches or returns the same pattern as in referenced capture \"" + node.text + "\".")
						PatternsShow(node.children, element)
					}
					break
				case PAT.BALANCED:
					{
						CreateDiv("balanced", parent, "%b" + node.text, "Balanced match.", "Matches characters starting at \"" + node.text.charAt(0) + "\" until the corresponding \"" + node.text.charAt(1) + "\".")
					}
					break
				case PAT.SET:
					{
						let element = CreateDiv("set", parent, "[...]", "Set.", "Matches any character from the set:")
						PatternsShow(node.children, element)
					}
					break
				case PAT.INVERSESET:
					{
						let element = CreateDiv("inverse set", parent, "[^...]", "Inverse set.", "Matches any character except:")
						PatternsShow(node.children, element)
					}
					break
				case PAT.POSITION:
					{
						let element = CreateDiv("position", parent, "()", "Position capture #" + node.text + ".", "Captures the position in the string.")
						PatternsShow(node.children, element)
					}
					break
				case PAT.CAPTURE:
					{
						let element = CreateDiv("capture", parent, "(...)", "Capture #" + node.text + ".", "Makes a pattern group to be used for backreferencing or substring output.")
						PatternsShow(node.children, element)
					}
					break
				case PAT.FRONTIER:
					{
						let element = CreateDiv("frontier", parent, "%f", "Frontier.", "Matches any character from the set when the previous character doesn't match it. Can match start and end boundaries of the string.")
						PatternsShow(node.children, element)
					}
					break
				case PAT.RANGE:
					{
						let s = node.text.charAt(0), e = node.text.charAt(1)
						let element = CreateDiv("range", parent, s + "-" + e, "Range.", "Matches any character in the range \"" + s + "\" (byte " + s.charCodeAt(0) + ") to \"" + e + "\" (byte " + e.charCodeAt(0) + ").")
						if (s > e) {
							CreateDiv("warning", element, "?", "Warning.", "The range won't match anything because the start of the range is greater than the end (\"" + s + "\" (" + s.charCodeAt(0) + ") > \"" + e + "\" (" + e.charCodeAt(0) + ")).")
						} else if (s === e) {
							CreateDiv("note", element, "i", "Note.", "The range has range of one character. Consider using regular char instead.")
						}
					}
					break
				case PAT.START:
					{
						let element = CreateDiv("start", parent, "^", "Start anchor.", "Tells to match the pattern only if it starts from the beginning of the string.")
					}
					break
				case PAT.END:
					{
						let element = CreateDiv("end", parent, "$", "End anchor.", "Tells to match the pattern only if it ends at the end of the string.")
					}
					break
				case PAT.WARNING:
					{
						CreateDiv("warning", parent, "?", "Warning.", node.text)
					}
					break
				case PAT.NOTE:
					{
						CreateDiv("note", parent, "i", "Note.", node.text)
					}
					break
				case PAT.ERROR:
					{
						CreateDiv("error", parent, "!", "Error.", node.text)
					}
					break
				default:
					console.log(node)
					CreateDiv("error", basediv, "!", "Error.", "Unknown pattern object (" + node.type + ") [" + PatToStr[node.type] + "]")
					break
			}
		}
	} catch (e) {
		CreateDiv("error", basediv, "!", "Error.", "Pattern renderer error: " + e.name + ": " + e.message)
	}
}

function PatternsPrint(input) {
	const tokens = PatternsLex(input)
	const output = PatternsParse(tokens)
	basediv = document.getElementById("result")
	CleanBaseDiv()
	PatternsShow(output, basediv)

}
