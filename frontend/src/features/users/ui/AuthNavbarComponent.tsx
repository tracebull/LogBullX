export function AuthNavbarComponent() {
  return (
    <div className="m-3 flex h-[65px] items-center justify-center p-3 sm:justify-start">
      <a href="/" className="flex items-center gap-3 hover:opacity-80">
        <img className="h-[35px] w-[35px]" src="/logo.svg" alt="TraceBull" />
        <span className="text-xl font-bold">TraceBull</span>
      </a>
    </div>
  );
}
