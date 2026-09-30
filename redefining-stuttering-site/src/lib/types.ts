export interface Chapter {
  slug: string;
  number: number | null;
  title: string;
  sectionId: string;
  sectionTitle: string;
  href: string;
  contentFile: string;
  sourceFile: string;
  sourcePages: string;
  readingMinutes: number;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
}

export interface PageHeading {
  depth: 2 | 3;
  slug: string;
  text: string;
}
