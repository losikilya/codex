import React, { useCallback, useState } from 'react';
import './App.css';
import { useDropzone } from 'react-dropzone';
import { isEmpty, cloneDeep } from 'lodash';

export const splitTextByRows = (text = '') => text.match(/[^\r\n]+/g);

export const validateCoordinates = (coordinates, canvasWidth, canvasHigh) => {
  const validCoordinates = [];
  for (let i = 0; i < coordinates.length; i++) {
    if (!isNaN(coordinates[i])) {
      const coordinateAsNumber = Number(coordinates[i]);
      if ((i % 2 === 0 && coordinateAsNumber <= canvasWidth + 1) || 
          (i % 2 === 1 && coordinateAsNumber <= canvasHigh + 1)) {
        validCoordinates.push(coordinateAsNumber);
      }
    }
  }

  return validCoordinates;
};

export const validateAndParseInputData = (text = '') => {
  let isCanvasCreated = false;
  let canvasWidth;
  let canvasHigh;
  const parsedValidData = [];
  const rows = splitTextByRows(text);
  
  if (!isEmpty(rows)) {
    rows.forEach( row => {
      const rowData = row.split(' ');
      const command = rowData.shift();

      if (command === 'C' && rowData.length === 2 && !isCanvasCreated) {
        const newRow = [ command ];
        rowData.forEach(coordinate => {
          if (!isNaN(coordinate)) {
            newRow.push(Number(coordinate));
          }          
        })

        if (newRow.length !== 3) { return false; }
        parsedValidData.push(newRow);
        canvasWidth = newRow[1];
        canvasHigh = newRow[2];
        isCanvasCreated = true;
      } else if ((command === 'L' || command === 'R') && rowData.length === 4 && isCanvasCreated) {
        const coordinates = validateCoordinates(rowData, canvasWidth, canvasHigh);
        const newRow = [ command, ...coordinates ];

        if (newRow.length !== 5) { return false; }
        parsedValidData.push(newRow);
      } else if (command === 'B' && rowData.length === 3 && isCanvasCreated) {
        const symbol = rowData.pop();
        const coordinates = validateCoordinates(rowData, canvasWidth, canvasHigh);
        const newRow = [ command, ...coordinates ];

        newRow.push(symbol);

        if (newRow.length !== 4) { return false; }
        parsedValidData.push(newRow);
      }
        
       return false
    });
    
  return parsedValidData;
  }

  return false;
};

export const drawCanvas = matrix => {
  const newMatrix = cloneDeep(matrix);
  const high = newMatrix.length;
  const width = newMatrix[0].length;

  newMatrix[0].fill('-');
  newMatrix[high - 1].fill('-');

  for ( let i = 1; i < high - 1; i++ ) {
    for ( let j = 0; j < width; j = j + width - 1 ) {
      newMatrix[i][j] = '|';
    }
  }

  return newMatrix;
};

export const drawLine = (prevState, coordinates, isClone = false) => {
  const newState = isClone ? cloneDeep(prevState) : prevState;
  let minX, maxX, minY, maxY;
  
  // add fucntionality to draw line left->right , right->left, down->up, up->down
  if (coordinates[0] <= coordinates[2]) {
    minX = coordinates[0];
    maxX = coordinates[2];
  } else {
    minX = coordinates[2];
    maxX = coordinates[0];
  }

  if (coordinates[1] <= coordinates[3]) {
    minY = coordinates[1];
    maxY = coordinates[3];
  } else {
    minY = coordinates[3];
    maxY = coordinates[1];
  }

  for (let i = minY; i <= maxY; i++) {
    for (let j = minX; j <= maxX; j++) {
      newState[i][j] = 'x';
    }
  }

  return newState;
};

export const drawRectangle = (prevState, coordinates) => {
  let newState = cloneDeep(prevState);
  // rectangle === 4 lines, so...
  const rectangle = [
    [coordinates[0], coordinates[1], coordinates[2], coordinates[1]],
    [coordinates[0], coordinates[3], coordinates[2], coordinates[3]],
    [coordinates[0], coordinates[1], coordinates[0], coordinates[3]],
    [coordinates[2], coordinates[1], coordinates[2], coordinates[3]]
  ];

  rectangle.forEach( line => newState = drawLine(newState, line));

  return newState;  
}

export const filling = (prevState, coordinates, symbol) => {
  const newState = cloneDeep(prevState);
  const heigh = prevState.length;
  const width = prevState[0].length;
  const colored = Array(heigh).fill().map(() => Array(width).fill(false));
  
  const dfs = (posI, posJ) => {
    colored[posI][posJ] = true;
    newState[posI][posJ] = symbol;
    
    if (posI < heigh - 1 && !colored[posI + 1][posJ] && newState[posI + 1][posJ] === ' ') {
      // go up
      dfs(posI + 1, posJ);
    }
    if (posI > 1 && !colored[posI - 1][posJ] && newState[posI - 1][posJ] === ' ') {
      // go down
      dfs(posI - 1, posJ);
    }
    if (posJ < width - 1 && !colored[posI][posJ + 1] && newState[posI][posJ + 1] === ' ') {
      // go right
      dfs(posI, posJ + 1);
    }
    if (posJ > 1 && !colored[posI][posJ - 1] && newState[posI][posJ - 1] === ' ') {
      // go left
      dfs(posI, posJ - 1);
    }
  };

  dfs(coordinates[1], coordinates[0]);

  return newState;
}

export const createOutputFileData = (data) => {
  const canvasWidth = data[0][1] + 2;
  const canvasHigh = data[0][2] + 2;
  const state = [];

  // create matrix
  const matrix = Array(canvasHigh).fill().map(() => Array(canvasWidth).fill(' '));
  // draw canvas
  let newState = drawCanvas(matrix);
  state.push( ...newState );

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'L') {
      newState = drawLine(newState, data[i].slice(1), true);
      state.push( ...newState ); 
    } else if (data[i][0] === 'R') {
      newState = drawRectangle(newState, data[i].slice(1));
      state.push( ...newState ); 
    } else if (data[i][0] === 'B') {
      newState = filling(newState, data[i].slice(1, 3), data[i][3]);
      state.push( ...newState ); 
    }

  }

  return state;
};

export const convertDataToString = data => Array.isArray(data) ?
  data.map(row => Array.isArray(row) ? (row.join('') + '\n') : '').join('') : ''; 

const App = () => {
  const [ outputData, setOutputData ] = useState();
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      if (file.type === "text/plain") {
        const reader = new FileReader()

        reader.onabort = () => console.log('file reading was aborted')
        reader.onerror = () => console.log('file reading has failed')
        reader.onload = () => {
          const textFile = reader.result
          // validate
          const inputValidData = validateAndParseInputData(textFile);
          // if input is correct 
          if (inputValidData) {
            setOutputData(createOutputFileData(inputValidData));
          } else {
            // add error { message: string } validation
            alert('Input data is invalid');

            return false;
          }
        }
        reader.readAsText(file)
      } else {
        alert(`${file.type} - is not accepted. File type should be text/plain.`)
      }
      
    })
    
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({onDrop})

  return (
    <div className="App">
      <header className="App-header">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          {
            isDragActive ?
            <p>Drop input.txt here ...</p> :
            <p>Drag 'n' drop file here, or click to select it</p>
          }
        </div>
          { outputData && <a
              href={ `data:text/plain;charset=utf-8,${ encodeURIComponent(convertDataToString(outputData)) }` }
              download="new output.txt">
                Download output.txt file
            </a>
          }
      </header>
    </div>
  );
}

export default App;
