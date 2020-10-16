export interface Comic {
  comic: {
    creator: Creator;
    body: Body;
  };
}

export interface Creator {
  name: string;
}

export interface Body {
  formatVersion: number;
  backgroundColor: string;
  fadeMode: boolean;
  items: Array<Item>;
  frames: Array<Frame>;
}

export interface Item {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  fileName: string;
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}
