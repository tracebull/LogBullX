import { ThemeToggle } from './ThemeToggle';

export function AuthNavbarComponent() {
  return (
    <div className="m-3 flex h-[65px] items-center justify-between p-3">
      <a href="/" className="flex items-center gap-3 hover:opacity-80">
        <img className="h-[35px] w-[35px] dark:invert" src="/logo.svg" alt="TraceBull" />
        <span className="text-xl font-bold">TraceBull</span>
      </a>
      <ThemeToggle />
    </div>
  );
}
