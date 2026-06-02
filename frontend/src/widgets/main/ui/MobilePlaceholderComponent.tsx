import type { JSX } from 'react';

export const MobilePlaceholderComponent = (): JSX.Element => {
  return (
    <div className="px-5 pt-10 text-base">
      <img
        src="/images/embarrassed-bull.png"
        alt="Mobile placeholder"
        className="mx-auto h-[200px] w-[200px]"
      />
      <br />
      <br />
      Mobile view is not yet supported. Please use a desktop or laptop for the best experience.
    </div>
  );
};
