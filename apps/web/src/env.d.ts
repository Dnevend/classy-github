/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** 由 middleware 解析：?theme= > cookie > default */
    theme: import('./lib/config').ThemeName;
  }
}
