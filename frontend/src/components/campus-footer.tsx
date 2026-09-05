import React from 'react';

export const CampusFooter: React.FC = () => {
  return (
    <footer className="w-full relative mt-auto overflow-hidden">
      {/* Campus Illustration */}
      <div className="w-full relative">
        <img
          src="/campus-illustration.png"
          alt="Campus Illustration"
          className="w-full aspect-[2172/724] object-contain object-bottom"
        />
      </div>
    </footer>
  );
};

export default CampusFooter;
