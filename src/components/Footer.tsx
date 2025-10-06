import React from 'react';

const VERSION = 'v1.2';
const BUILD_NUMBER = '20250106-143000';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 mt-auto border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs text-muted-foreground font-mono">
          MyBadgeLife {VERSION} • Build {BUILD_NUMBER}
        </p>
      </div>
    </footer>
  );
};
