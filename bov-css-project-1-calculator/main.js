(function() {
    'use strict';
    /**
     * In this implementation, I will not be using eval.
     * I will use a stack to perform arithmetic operations.
     * */
    var operands = [];
    // A separate stack for collecting numbers
    var numbers = [];
    var emptyStr = "";
    var addSign = "+";
    var subtractSign = "-";
    var multiplySign = "×";
    var divideSign = "÷";

    // Cache the input element, because we will be manipulating its
    // contents on a regular basis.
    var input = document.querySelector('input.calculator-input');
    // Error message
    var errorMsgContainer = document.querySelector('.error-msg').parentElement;

    /**
     * Validation and utilities
     * =====================================
     * */

    function getText(label) {
        return (label.innerText || label.textContent).trim();
    }

    function getLastOperand() {
        return operands[operands.length -1];
    }

    /**
     * Used to start parsing string from left to right
     * and ignore leading zeros
     * 1-9
     * */
    function isNumberGreaterThanZero(char) {
        var charCode = char.charCodeAt(0);
        return charCode > 48 && charCode < 58;

    }

    /**
     * Is a character between 0 and 9
     * */
    function isANumber(char) {
        var charCode = char.charCodeAt(0);
        return charCode > 47 && charCode < 58;
    }

    function isEmptySpace(char) {
        return char === ' ';
    }


    /**
     * Check whether a character is one of the following
     * arithmetic operators
     * - (add, subtract, multiply, divide)
     * */
    function isAOperator(char) {
        return char === addSign || char === subtractSign ||
            char === multiplySign || char === divideSign;
    }

    /**
     * Check if string contains operator
     * */
    function containsOperator(str) {
        return str.split('').filter(function(c) {
            return !isAOperator(c);
        }).length !== str.length;
    }

    /**
     * Order inputs so that our interpreter can understand
     * the string passed in
     * @param {String} lastChar The last character entered
     * @param {String} input the input value prior to entering in new value
     * */
    function orderInputs(lastChar, input) {
        var lastCharOfInput = input[input.length - 1];
        var result;
        // Do nothing if last character prior to input is not an operator
        if (!isAOperator(lastCharOfInput)) {
            return input + lastChar;
        }
        // " x - || / -" => swap char to "- x || - /"
        if (lastChar === subtractSign &&
            (lastCharOfInput === multiplySign ||
             lastCharOfInput === divideSign)) {
            result = input.substring(0, input.length - 1) + lastChar + lastCharOfInput;
        } else {
            result = input;
        }
        return result;
    }

    /**
     * Note that operations contained inside of brackets gain precedence
     * (from left to right).
     * We will handle statements inside of brackets first. After result is returned,
     * we will handle the operations that are remaining.
     *
     * If we adre adding two numbers e.g.
     * 4 + 2
     * it will go onto the stack as follow
     * 4 2 +
     *
     * When an arithmetic operator (+, -, etc.) is found, it will perform the operation
     * denoted by the symbol on all the previous elements, emptying all items on the stack prior to it.
     *
     * Elements inside of brackets () are handled inside of a priority stack
     * and are operated on first.
     *
     * Note that if additional features will be added to this calculator, this is not the best approach.
     * I did the quick and easy way, so that I can focus on writing the arithmetic expression parser.
     * */
    function handleEvent(label) {
        var btnText = getText(label);
        var currentInput = input.value;
        if (isAOperator(btnText)) {
            input.value = orderInputs(btnText, currentInput);
        }
        // Arithmetic calculation
        else if (btnText === "=") {
            doCalculation(currentInput + btnText);
        // Clear
        } else if (btnText === 'C') {
            input.value = emptyStr;
        }
        // Delete
        else if (btnText === 'DEL') {
            if (currentInput.length) {
                input.value = currentInput.slice(0, -1);
            }
        }
        // Negate
        else if (btnText === '+/-') {
            doCalculationNegated(currentInput);
        // number pad and arithmetic operators
        } else {
            input.value = currentInput + btnText;
        }
    }

    function validateResult(result) {
        if (isNaN(result)) {
            errorMsgContainer.classList.remove('hidden');
            // Hide after 6 seconds
            setTimeout(function() {
                errorMsgContainer.classList.add('hidden');
            }, 6000);
            return false;
        } else {
            errorMsgContainer.classList.add('hidden');
            return true;
        }
    }

    /**
     * Perform calculation by parsing the input string
     * */
    function doCalculation(inputStr) {
        var result = performArithmeticCalculation(inputStr);
        if (validateResult(result)) {
            input.value = result;
        }
    }

    /**
     * Negate the result
     * */
    function doCalculationNegated(inputStr) {
        var result, numbered = Number(inputStr);
        // Negate right away if valid number
        if (!isNaN(numbered)) {
            result = -numbered;
        } else {
            result = -performArithmeticCalculation(inputStr);
        }
        if (validateResult(result)) {
            input.value = result;
        }
    }

    /**
     * Parses a string input and returns the calculated result. E.g.
     *
     * E.g. (3 + 4 * 9) - 12
     *
     * This assumes that the string contains no whitespaces.
     *
     * @param {String} inputStr a string containing the mathematic operation
     * @return {Number}
     * */
    function performArithmeticCalculation(inputStr) {
        // Remove "equals"
        inputStr = inputStr.substring(0, inputStr.length - 1);
        // iterate through characters
        for (var i = 0; i < inputStr.length; i++) {
            var char = inputStr[i];
            // Get current number
            if (isANumber(char)) {
                var numberArr = [];
                // "." for decimal numbers
                while (char != null && (isANumber(char) || char === '.')) {
                    numberArr.push(inputStr[i]);
                    i++;
                    char = inputStr[i];
                }
                // Since we stopped at a non-number, backtrack.
                --i;
                // Add newly formed number onto the stack of numbers
                var num = Number(numberArr.join(''));
                // Check that user input is indeed a number:
                if (isNaN(num)) {
                    validateResult(result);
                }
                numbers.push(num);
            } else if (isAOperator(char)) {
                // While top of 'ops' has same or greater precedence to current
                // token, which is an operator. Apply operator on top of 'ops'
                // to top two elements in values stack
                while (operands.length && hasPrecedence(char, getLastOperand())) {
                    performSingleOperation();
                }
                operands.push(char);
            } else {
                validateResult(inputStr);
            }
        }
        // Handle operations that remain
        // ops to remaining values
        while (operands.length > 0) {
            performSingleOperation();
        }
        // Top of 'values' contains result, return it
        return numbers.pop();
    }

    /**
     * Remove the top two numbers from the stack and
     * perform calculation with the operand at the top of
     * the operand stack.
     * */
    function performSingleOperation(leftHandSide, rightHandSide) {
        var operand = operands.pop();
        rightHandSide = rightHandSide || numbers.pop();
        leftHandSide = leftHandSide || numbers.pop();
        // if operand is a minus and leftHandSide is empty
        // make right hand side 0 and
        // right hand side negative
        // E.g. -999 = 0 - 999
        if (operand === subtractSign && !leftHandSide) {
            rightHandSide = -rightHandSide;
            leftHandSide = 0;
            operand = operands.pop();  // Move onto next operand
            if (!operand) {
                numbers.push(rightHandSide);
                return;
            }
        // Second case is where sign is
        // a minus and preceeding character is also a sign
        } else if (operand === subtractSign && operands.length) {
            // Double minuses E.g. 0 -- 3
            if (getLastOperand() === subtractSign) {
                operands.pop();
                operand = operands.pop();  // Move onto next operand after minus
                performSingleOperation(leftHandSide, rightHandSide);
            // Minus and something else E.g. 9 * - 3
            } else {
                rightHandSide = -rightHandSide;
                operand = operands.pop();
            }
        } else {
            numbers.push(getCalculatedResult(leftHandSide, rightHandSide, operand));
        }
    }

    /**
     * Multiplication and division have the highest precedence.
     * */
    function hasPrecedence(operand1, operand2) {
        // If right hand side operand is a bracket, dont have precedence
        if (operand2 === '(' || operand2 === ')') {
            return false;
        }
        if ((operand1 === multiplySign || operand1 === divideSign) &&
            (operand2 === addSign || operand2 === subtractSign)) {
            return false;
        }
        return true;
    }

    /**
     * Perform calculation based on the sign that was passed.
     * @param {Number} num1 Number on the left hand side
     * @param {Number} num2 Number on the right hand side
     * @param {String} the arithmetic operator E.g. +,-, etc.
     * @return {Number}
     * */
    function getCalculatedResult(num1, num2, sign) {
        var result;
        switch(sign) {
            case addSign:
                result = num1 + num2;
                break;
            case subtractSign:
                result = num1 - num2;
                break;
            case multiplySign:
                result = num1 * num2;
                break;
            case divideSign:
                result = num1 / num2;
                break;
            default:
                throw Error("Invalid sign: " + sign);
        }
        return result;
    }

    /**
     * Intialize all keypad event listeners
     * */
    function initializeKeypad() {
        var labels = document.querySelectorAll(".calculator-column");
        Array.prototype.forEach.call(labels, function(label) {
            label.addEventListener('click' , function(evt) {
                // Prevent event from being trigger twice from radio button click
                // due to event delegation
                evt.preventDefault();
                handleEvent(this);
            });
        });
    }

    /**
     * Initializaltion logic
     * */
    function init() {
        initializeKeypad();
    }
    init();
})();
