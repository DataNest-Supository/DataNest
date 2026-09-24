export type CompanionPlacementInput = {
  screenLeft:number;
  screenTop:number;
  screenWidth:number;
  screenHeight:number;
  browserLeft:number;
  browserTop:number;
  browserWidth:number;
  browserHeight:number;
  dockWidth:number;
  preferredWidth:number;
};

export type CompanionPlacement = {
  left:number;
  top:number;
  width:number;
  height:number;
};

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

export function calculateCompanionPlacement(input:CompanionPlacementInput):CompanionPlacement{
  const gap=8;
  const screenRight=input.screenLeft+input.screenWidth;
  const screenBottom=input.screenTop+input.screenHeight;
  const browserRight=input.browserLeft+input.browserWidth;
  const freeRight=Math.max(0,screenRight-browserRight);
  const freeLeft=Math.max(0,input.browserLeft-input.screenLeft);

  let width=clamp(input.preferredWidth,460,760);
  let left:number;

  if(freeRight>=width+gap){
    left=browserRight+gap;
  }else{
    const mainSpace=input.browserWidth-input.dockWidth-gap*2;
    if(mainSpace>=360){
      width=Math.min(width,mainSpace);
      left=browserRight-input.dockWidth-gap-width;
    }else if(freeLeft>=width+gap){
      left=input.browserLeft-gap-width;
    }else{
      width=Math.min(width,Math.max(320,input.screenWidth-input.dockWidth-gap*2));
      left=clamp(
        browserRight-input.dockWidth-gap-width,
        input.screenLeft,
        Math.max(input.screenLeft,screenRight-width)
      );
    }
  }

  const height=clamp(input.browserHeight,620,input.screenHeight);
  const top=clamp(
    input.browserTop,
    input.screenTop,
    Math.max(input.screenTop,screenBottom-height)
  );

  return {left:Math.round(left),top:Math.round(top),width:Math.round(width),height:Math.round(height)};
}
