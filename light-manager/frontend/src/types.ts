export type BulbDto = {
  slot: number;
  r: number;
  g: number;
  b: number;
  updated_at: string;
};

export type UserStateDto = {
  login: string;
  bulbs: BulbDto[];
};
