declare global {
  export interface Error {
    errno: number;
    code: string;
    syscall: string;
    path: string;
  }
}
