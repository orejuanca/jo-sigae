const XLSX = require('xlsx');
const wb = XLSX.readFile('/home/z/my-project/upload/Base de Datos plan vigente.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const cols = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];
console.log('Total columnas:', cols.length);
console.log('---');
cols.forEach((c, i) => console.log(i + ': ' + JSON.stringify(c)));
