// UI FUNCTIONS
function appendTestsToUI(testCases) {
  for (var test in testCases) {
    t = fixTestCaseName(test)
    localStorage.setItem(t, testCases[test])
    $("#tests").append(`<input type="checkbox" class="testcase" value="${t}" onmouseover="showTestConversation(this)" onmouseout="removeTestConversation(this)"> ${t} </br>`)
  }

  showForm()
}

function showTestConversation(event) {
  let id = event.value
  var test = localStorage.getItem(id)

  addTestConversationHeader()

  ft = formatTestFromCSV(test, id)
  for (var line in ft) {
    $("#testConversation").append(`<p class="testconv">${ft[line]}</p>`)
  }

  $("#testConversation").show()
}

function addTestConversationHeader() {
  $("#testConversation").append(`<h3 class="testconv">Conversation:</h3>`)
}

function removeTestConversation(event) {
  $(".testconv").remove()
}

function hideForm() {
  $("#form").hide()
}

function showForm() {
  $("#form").show()
}

function getCheckedTests(event) {
  let checkedTests = []

  $(".testcase:checked").each(function() {
    checkedTests.push($(this).val())
  })
  return checkedTests
}

// READ FUNCTIONS
function openFile(event) {
  var input = event.target
  var testFiles = input.files

  for (var i = 0; i < testFiles.length; i++) {
    var reader = new FileReader()

    reader.onload = function() {
      var fileData = reader.result
      var testCases = convertTests(fileData)

      appendTestsToUI(testCases)
    };

    reader.readAsText(testFiles[i])
  }
}

// csv conversion taken from https://stackoverflow.com/questions/1293147/javascript-code-to-parse-csv-data
function convertTests(strData) {
  var objPattern = new RegExp((
      "(\\" + "," + "|\\r?\\n|\\r|^)" +
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
      "([^\"\\" + "," + "\\r\\n]*))"
    ),
    "gi"
  )

  var arrData = [
    []
  ]
  var arrMatches = null;
  while (arrMatches = objPattern.exec(strData)) {
    var strMatchedDelimiter = arrMatches[1]

    if (strMatchedDelimiter.length && (strMatchedDelimiter != ",")) {
      arrData.push([])
    }

    if (arrMatches[2]) {
      var strMatchedValue = arrMatches[2].replace(
        new RegExp("\"\"", "g"), "\""
      );
    } else {
      var strMatchedValue = arrMatches[3];
    }
    arrData[arrData.length - 1].push(strMatchedValue)
  }
  arrData = arrData.slice(3, -1)
  return testToHashTable(arrData)
}

// done recursively out of bordem... refactor to be fit codebase style
function testToHashTable(fileData, testCaseName, testHash, currentTest) {
  var testCaseName = testCaseName || ""
  var testHash = testHash || {}
  var currentTest = currentTest || []

  if (fileData.length == 0) {
    testHash[testCaseName] = currentTest // add test to hash
    return
  }
  // fileData[0][0] is a test name...
  if (fileData[0][0] != "") {
    // we set currentTest to an empty array everytime we add a test to the hash
    // so we check for an empty array...
    if (currentTest.length == 0) {
      testCaseName = fileData[0][0]
      let testLine = fileData[0]

      currentTest.push(testLine) // create test

      fileData.shift()
      testToHashTable(fileData, testCaseName, testHash, currentTest)
    } else {
      testHash[testCaseName] = currentTest
      testToHashTable(fileData, testCaseName, testHash, [])
    }
  } else {
    let testLine = fileData[0]
    currentTest.push(testLine) //add line to test

    fileData.shift()
    testToHashTable(fileData, testCaseName, testHash, currentTest)
  }
  return testHash
}

// CREATE FUNCTIONS
function createTests(event) {
  var checkedTests = getCheckedTests(event)
  var tests = getTests(checkedTests)

  writeToCSV(tests)
  return false
}

function writeToCSV(tests) {
  const metaHeaders = ["url", "user", "pass", "domain", ]
  const filledHeaders = ["<INSTANCE URL>", "", "", "<DOMAIN CODE>"]
  const headers = ["\ntest case", "utterance", "matcher", "expected result"]
  var csvTests = []
  var chunkedArrays = []
  var counter = 0

  for (test in tests) {
    let fcs = fixCommaSeparation(tests[test])
    var currentRow = []
    for (line in fcs) {
      if (counter < 4 && line === fcs.length) {
        chunkedArrays.push(currentRow)
      } else if (counter < 4 && counter === 0) { //start new row
        currentRow.push(`\n${fcs[line]}`)
        counter += 1
      } else if (counter < 4) {
        currentRow.push(fcs[line])
        counter += 1
      } else if (counter === 4) {
        chunkedArrays.push(currentRow)
        currentRow = []
        counter = 0
      }
    }
  }
  download([metaHeaders, filledHeaders, headers, chunkedArrays].toString())
}

function download(testFile) {
  var element = createDownloadElment(testFile)

  element.click()
  document.body.removeChild(element)
}

function createDownloadElment(testFile) {
  var fileName = "testcases.csv"
  var element = document.createElement('a')

  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(testFile))
  element.setAttribute('download', fileName)
  document.body.appendChild(element)

  return element
}

// FORMAT FUNCTIONS
function getTests(selectedTests) {
  var tests = []

  for (test in selectedTests) {
    tests.push(localStorage.getItem(selectedTests[test]).split(","))
  }
  return tests
}

function formatTestFromCSV(test, testName) {
  var test = test.replace(testName, "")
  var str = ""
  for (var i = 0; i < test.length; i++) {
    if ((test[i] + test[i + 1]) === ",,") {
      str += ""
    } else if (test[i] != ",") {
      str += test[i]
    } else {
      str += ","
    }
  }
  return format(str.split(","))
}

function format(test) {
  var line = []
  for (var i = 0; i < test.length; i++) {
    if ((test[i] === "") || (test[i] === "Full") || (test[i] === "Partial")) {
      // do nothing
    } else if (test[i][0] === " ") {
      line.splice(-1, 1) //remove last utterance from array
      let cu = correctedUtterance(test[i-1], test[i])
      line.push(cu)
    } else {
      line.push(test[i])
    }
  }
  return line
}

function correctedUtterance(previousUtterance, currentUtterance) {
  return previousUtterance + ", " + currentUtterance
}

function fixCommaSeparation(test) {
  var currentRow = []
  for (var i = 0; i < test.length; i++) {
    if (test[i][0] === " ") {
      currentRow.splice(-1, 1) //remove last utterance from array
      // replacing comma b/c of csv parsing and I'm lazy!
      let utterance = test[i - 1] + ";" + test[i]

      currentRow.push(utterance)
    } else {
      currentRow.push(test[i])
    }
  }
  return currentRow
}

function fixTestCaseName(testName) {
  str = ""
  for (var i = 0; i < testName.length; i++) {
    if (testName[i] != "\"") {
      str += testName[i]
    } else {
      str += "'"
    }
  }
  return str
}
