//CKEDITOR.instances.myInput.on("change", function ()

function test() {
  var insideP = false;
  var inside = false;
  var insideC = false;
  var parsedString = "";
  var parenthesis = 0;

  var textField = document.getElementById("myInput"); //get element by Id
  let text = textField.value;

  let charArray = Array.from(text); //Array from input

  //Parenthesis - opening
  charArray.map((c, index, row) => {
    if (c == "(") {
      if (parenthesis > 2) {
        c = `<span class="parenthesis3">${c}</span>`;
      }
      if (parenthesis == 2) {
        c = `<span class="parenthesis2">${c}</span>`;
      }
      if (parenthesis == 1) {
        c = `<span class="parenthesis1">${c}</span>`;
      }
      if (parenthesis == 0) {
        c = `<span class="parenthesis0">${c}</span>`;
      }
      parenthesis++;
      insideP = true;
    }

    //Parenthesis - closing
    if (c == ")") {
      if (parenthesis > 3) {
        c = `<span class="parenthesis3">${c}</span>`;
      }
      if (parenthesis == 3) {
        c = `<span class="parenthesis2">${c}</span>`;
      }
      if (parenthesis == 2) {
        c = `<span class="parenthesis1">${c}</span>`;
      }
      if (parenthesis <= 1) {
        c = `<span class="parenthesis0">${c}</span>`;
      }
      insideP = false;
      parenthesis--;
    }

    // ^
    if (c == "^" && index == 0) {
      c = `<span class="caret0">${c}</span>`;
    }

    //^chars
    if (c == "^" && index != 0) {
      let chars = "";
      chars += c;
      if (charArray[index + 1] == "c") {
        chars += charArray[index + 1];

        if (charArray[index + 2] == "h") {
          chars += charArray[index + 2];

          if (charArray[index + 3] == "a") {
            chars += charArray[index + 3];

            if (charArray[index + 4] == "r") {
              chars += charArray[index + 4];

              if (charArray[index + 5] == "s") {
                chars += charArray[index + 5];
              }
            }
          }
        }
        for (let i = 0; i < 5; i++) {
          charArray.shift();
          c = `<span class="chars0">${chars}</span>`;
        }
      } else {
        c = `<span class="not0">${chars}</span>`;
      }
    }

    //Quantifier
    if (c == "+" || c == "-" || c == "*" || c == "?") {
      c = `<span class="quantifier0">${c}</span>`;
    }

    //Any
    if (c == "." && charArray[index - 1] != "%") {
      c = `<span class="any0">${c}</span>`;
    }

    //Capture
    if (c == "[") {
      inside = true;
      c = `<span class="square0">${c}</span>`;
    }

    if (c == "]") {
      inside = false;
      c = `<span class="square0">${c}</span>`;
    }

    //Inside Capture
    if (c == "%" && (inside || insideP)) {
      scaped = false;
      if (
        charArray[index + 1] == "f" ||
        charArray[index + 1] == "a" ||
        charArray[index + 1] == "c" ||
        charArray[index + 1] == "d" ||
        charArray[index + 1] == "g" ||
        charArray[index + 1] == "l" ||
        charArray[index + 1] == "p" ||
        charArray[index + 1] == "s" ||
        charArray[index + 1] == "u" ||
        charArray[index + 1] == "w" ||
        charArray[index + 1] == "x" ||
        charArray[index + 1] == "z" ||
        charArray[index + 1] == "A"
      ) {
        c = `<span class="capture0">${c + charArray[index + 1]}</span>`;
        charArray.shift();
      }
    }

    //%f
    if (c == "%" && !inside) {
      let chars = "";
      chars += c;
      if (charArray[index + 1] == "f") {
        chars += charArray[index + 1];
        charArray.shift();

        c = `<span class="frontier0">${chars}</span>`;
      }
    }

    //%1
    if (c == "%" && charArray[index + 1] == "1") {
      c = `<span class="captureReference0">${c + charArray[index + 1]}</span>`;
      charArray.shift();
    }

    //Balanced match
    if (c == "%") {
      let chars = "";
      chars += c;
      if (charArray[index + 1] == "b") {
        chars += charArray[index + 1];
        if (charArray[index + 2] == "{") {
          chars += charArray[index + 2];
          insideC = true;
        }
        charArray = charArray.splice(index, 2);
        c = `<span class="balanced0">${chars}</span>`;
      }
    }

    if (c == "}" && insideC) {
      insideC = false;
      c = `<span class="balanced0">${c}</span>`;
      charArray.shift();
    }

    //End anchor
    if (c == "$" && index + 1 == row.length) {
      c = `<span class="end0">${c}</span>`;
    }

    //%Scaped Character - least priority

    if (c == "%") {
      c = `<span class="scaped0">${c}</span>`;
    }

    parsedString += c;

    document.getElementById("mytest").innerHTML = parsedString;
  });
}
