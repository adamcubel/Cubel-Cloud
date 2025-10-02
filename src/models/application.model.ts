export interface Application {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path data or path to SVG file (e.g., "assets/kubernetes.svg")
  url: string;
}
