export const MAX_EXTRACT_CHARS=12_000;
export const MAX_CSV_ROWS=200_000;
export const MAX_CSV_COLUMNS=2_000;
export const MAX_CSV_FIELD_BYTES=1024*1024;
export const MAX_JSON_DEPTH=100;

export type SourceLocator=
  |{type:"lines";start:number;end:number}
  |{type:"csv_rows";startRow:number;endRow:number;columns:string[]}
  |{type:"json_pointer";path:string}
  |{type:"pdf_page";page:number}
  |{type:"docx_block";block:number;kind:string;heading?:string|null};

export type ExtractedChunk={
  text:string;
  locator:SourceLocator;
};

export type StructuredExtraction={
  text:string;
  chunks:ExtractedChunk[];
  warnings:string[];
};

function splitLines(value:string){
  return value.replace(/\r\n?/g,"\n").split("\n");
}

export function extractTxt(value:string):StructuredExtraction{
  const lines=splitLines(value);
  const chunks:ExtractedChunk[]=[];
  let start=0;
  let current:string[]=[];
  let chars=0;

  const flush=()=>{
    if(!current.length)return;
    chunks.push({
      text:current.join("\n"),
      locator:{type:"lines",start:start+1,end:start+current.length}
    });
    start+=current.length;
    current=[];
    chars=0;
  };

  for(const line of lines){
    const additional=(current.length?1:0)+line.length;
    if(current.length&&chars+additional>MAX_EXTRACT_CHARS)flush();

    if(line.length<=MAX_EXTRACT_CHARS){
      if(!current.length)start=lines.indexOf(line,start);
      current.push(line);
      chars+=(current.length>1?1:0)+line.length;
      continue;
    }

    flush();
    const lineNumber=lines.indexOf(line,start)+1;
    for(let offset=0;offset<line.length;offset+=MAX_EXTRACT_CHARS){
      chunks.push({
        text:line.slice(offset,offset+MAX_EXTRACT_CHARS),
        locator:{type:"lines",start:lineNumber,end:lineNumber}
      });
    }
    start=lineNumber;
  }
  flush();

  return {text:value,chunks,warnings:[]};
}

function utf8Bytes(value:string){
  return new TextEncoder().encode(value).byteLength;
}

function assertCsvField(field:string){
  if(field.length>MAX_CSV_FIELD_BYTES||utf8Bytes(field)>MAX_CSV_FIELD_BYTES){
    throw new Error("CSV field exceeds the 1 MiB limit.");
  }
}

export function parseCsv(value:string):string[][]{
  const rows:string[][]=[];
  let row:string[]=[];
  let field="";
  let quoted=false;
  let afterQuote=false;

  const pushField=()=>{
    assertCsvField(field);
    row.push(field);
    field="";
    afterQuote=false;
    if(row.length>MAX_CSV_COLUMNS)throw new Error("CSV exceeds the 2,000 column limit.");
  };
  const pushRow=()=>{
    pushField();
    rows.push(row);
    row=[];
    if(rows.length>MAX_CSV_ROWS)throw new Error("CSV exceeds the 200,000 row limit.");
  };

  for(let index=0;index<value.length;index++){
    const char=value[index];

    if(quoted){
      if(char==='"'){
        if(value[index+1]==='"'){
          field+='"';
          index++;
        }else{
          quoted=false;
          afterQuote=true;
        }
      }else{
        field+=char;
        if(field.length>MAX_CSV_FIELD_BYTES)throw new Error("CSV field exceeds the 1 MiB limit.");
      }
      continue;
    }

    if(afterQuote){
      if(char===","){
        pushField();
        continue;
      }
      if(char==="\n"){
        pushRow();
        continue;
      }
      if(char==="\r"&&value[index+1]==="\n"){
        index++;
        pushRow();
        continue;
      }
      throw new Error("Malformed CSV: unexpected content after a closing quote.");
    }

    if(char==='"'){
      if(field.length)throw new Error("Malformed CSV: quote must begin an empty field.");
      quoted=true;
      continue;
    }
    if(char===","){
      pushField();
      continue;
    }
    if(char==="\n"){
      pushRow();
      continue;
    }
    if(char==="\r"){
      if(value[index+1]==="\n")index++;
      pushRow();
      continue;
    }

    field+=char;
    if(field.length>MAX_CSV_FIELD_BYTES)throw new Error("CSV field exceeds the 1 MiB limit.");
  }

  if(quoted)throw new Error("Malformed CSV: unterminated quoted field.");
  if(field.length||row.length||!rows.length)pushRow();

  const width=rows[0]?.length||0;
  if(width>MAX_CSV_COLUMNS)throw new Error("CSV exceeds the 2,000 column limit.");
  for(let index=1;index<rows.length;index++){
    if(rows[index].length!==width){
      throw new Error("Malformed CSV: row "+(index+1)+" has "+rows[index].length+" columns; expected "+width+".");
    }
  }
  return rows;
}

function csvEscape(value:string){
  return /[",\r\n]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
}

function csvLine(row:string[]){
  return row.map(csvEscape).join(",");
}

export function extractCsv(value:string):StructuredExtraction{
  const rows=parseCsv(value);
  if(!rows.length)return {text:value,chunks:[],warnings:[]};

  const columns=rows[0].map((column,index)=>column||"column_"+(index+1));
  const header=csvLine(rows[0]);
  const chunks:ExtractedChunk[]=[];
  let current:string[]=[];
  let startRow=2;
  let currentChars=header.length;

  const flush=(endRow:number)=>{
    if(!current.length)return;
    chunks.push({
      text:[header,...current].join("\n"),
      locator:{type:"csv_rows",startRow,endRow,columns}
    });
    current=[];
    currentChars=header.length;
  };

  for(let rowIndex=1;rowIndex<rows.length;rowIndex++){
    const line=csvLine(rows[rowIndex]);
    if(!current.length)startRow=rowIndex+1;

    if(current.length&&currentChars+1+line.length>MAX_EXTRACT_CHARS){
      flush(rowIndex);
      startRow=rowIndex+1;
    }

    if(header.length+1+line.length<=MAX_EXTRACT_CHARS){
      current.push(line);
      currentChars+=1+line.length;
      continue;
    }

    flush(rowIndex);
    const budget=Math.max(1,MAX_EXTRACT_CHARS-header.length-1);
    for(let offset=0;offset<line.length;offset+=budget){
      chunks.push({
        text:header+"\n"+line.slice(offset,offset+budget),
        locator:{type:"csv_rows",startRow:rowIndex+1,endRow:rowIndex+1,columns}
      });
    }
  }
  flush(rows.length);

  return {text:value,chunks,warnings:[]};
}

export function escapeJsonPointerToken(value:string){
  return value.replaceAll("~","~0").replaceAll("/","~1");
}

function jsonValueText(path:string,value:unknown){
  const rendered=typeof value==="string"?value:JSON.stringify(value);
  return (path||"/")+" = "+rendered;
}

export function extractJson(value:string):StructuredExtraction{
  let parsed:unknown;
  try{
    parsed=JSON.parse(value);
  }catch{
    throw new Error("Malformed JSON.");
  }

  const chunks:ExtractedChunk[]=[];
  const visit=(node:unknown,path:string,depth:number)=>{
    if(depth>MAX_JSON_DEPTH)throw new Error("JSON exceeds the maximum nesting depth of 100.");

    if(Array.isArray(node)){
      if(!node.length){
        chunks.push({text:jsonValueText(path,node),locator:{type:"json_pointer",path}});
        return;
      }
      node.forEach((item,index)=>visit(item,path+"/"+index,depth+1));
      return;
    }

    if(node&&typeof node==="object"){
      const entries=Object.entries(node as Record<string,unknown>);
      if(!entries.length){
        chunks.push({text:jsonValueText(path,node),locator:{type:"json_pointer",path}});
        return;
      }
      for(const [key,item] of entries){
        visit(item,path+"/"+escapeJsonPointerToken(key),depth+1);
      }
      return;
    }

    const text=jsonValueText(path,node);
    if(text.length<=MAX_EXTRACT_CHARS){
      chunks.push({text,locator:{type:"json_pointer",path}});
      return;
    }
    for(let offset=0;offset<text.length;offset+=MAX_EXTRACT_CHARS){
      chunks.push({
        text:text.slice(offset,offset+MAX_EXTRACT_CHARS),
        locator:{type:"json_pointer",path}
      });
    }
  };

  visit(parsed,"",0);
  return {text:value,chunks,warnings:[]};
}

export function formatSourceLocator(locator:SourceLocator){
  switch(locator.type){
    case "lines":
      return locator.start===locator.end
        ?"line "+locator.start
        :"lines "+locator.start+"-"+locator.end;
    case "csv_rows":
      return (locator.startRow===locator.endRow
        ?"CSV row "+locator.startRow
        :"CSV rows "+locator.startRow+"-"+locator.endRow)
        +" · "+locator.columns.join(", ");
    case "json_pointer":
      return "JSON "+(locator.path||"/");
    case "pdf_page":
      return "PDF page "+locator.page;
    case "docx_block":
      return "DOCX "+(locator.heading?locator.heading+" · ":"")+locator.kind+" "+locator.block;
  }
}
