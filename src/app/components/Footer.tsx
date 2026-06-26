import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 px-6 text-center text-xs text-gray-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-serif-body">
          &copy; 2026 Wimbledon Customizer Lab. All rights reserved. Physics equations verified for lawn tennis standards.
        </p>
        <div className="flex gap-4 font-sans font-medium">
          <a href="#" className="hover:text-wimbledon-green underline transition-colors">Affiliate Disclosure</a>
          <a href="#" className="hover:text-wimbledon-green underline transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-wimbledon-purple underline transition-colors">Contact Engineering</a>
        </div>
      </div>
    </footer>
  );
}
