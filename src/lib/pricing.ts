export interface PricePackage {
  id: string;
  points: number;
  amountCents: number;
  label: string;
  popular?: boolean;
}

export const PRICE_PACKAGES: PricePackage[] = [
  { id: "small", points: 50, amountCents: 690, label: "50 积分" },
  { id: "medium", points: 150, amountCents: 1690, label: "150 积分", popular: true },
  { id: "large", points: 400, amountCents: 3690, label: "400 积分" },
  { id: "xlarge", points: 800, amountCents: 5990, label: "800 积分" },
];

export function getPackageByPoints(points: number): PricePackage | undefined {
  return PRICE_PACKAGES.find((p) => p.points === points);
}
