import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Book } from "../../modern/resources/js/types";
import data from "./data/books.json";
export const Collection = createContext<{
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
}>({ books: data, setBooks: () => {} });
export const initialBooks: Book[] = data;
export const demoCategories = [
  "Literatura",
  "Ciencia",
  "Filosofía",
  "Arte",
  "Tecnología",
  "Historia",
  "General",
];
export const demoColors: Record<string, string> = {
  olive: "Verde oliva",
  amber: "Ámbar",
  blue: "Azul",
  rose: "Rosa",
  terracotta: "Terracota",
  purple: "Morado",
};
export function useCollection() {
  return useContext(Collection);
}
