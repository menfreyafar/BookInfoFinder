export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1121.8512 955.23969"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main orange ellipse - base from your original design */}
      <ellipse
        fill="#fd6c08"
        fillOpacity="1"
        cx="549.29218"
        cy="476.44492"
        rx="437.6713"
        ry="443.54608"
      />
      
      {/* Yellow organic shapes - simplified from your original paths */}
      <g fill="#f8d64c" fillOpacity="1">
        {/* Top flowing elements */}
        <path d="M 431.8,303 C 450,290 480,275 520,260 C 580,235 650,220 720,225 C 780,230 820,250 840,280 C 850,300 845,320 835,340 C 820,370 790,390 750,400 C 700,415 640,420 580,415 C 520,410 470,395 440,375 C 420,360 415,340 425,320 C 430,310 435,305 431.8,303 Z" />
        
        {/* Right side flowing elements */}
        <path d="M 760,590 C 740,620 715,645 685,665 C 650,690 610,710 565,720 C 520,730 475,725 435,710 C 400,695 375,670 365,640 C 355,610 360,580 375,555 C 395,520 430,495 470,480 C 520,460 575,450 625,455 C 675,460 720,475 750,500 C 770,520 775,545 770,570 C 765,585 762,588 760,590 Z" />
        
        {/* Bottom flowing elements */}
        <path d="M 435,714 C 465,725 500,730 540,728 C 590,725 640,715 685,700 C 730,685 770,665 800,640 C 825,620 840,595 845,568 C 850,540 845,512 835,486 C 820,450 795,420 765,395 C 725,365 680,340 630,325 C 575,308 515,300 460,305 C 410,310 365,325 330,350 C 300,370 280,395 275,425 C 270,450 280,475 300,495 C 325,520 360,535 400,545 C 420,550 430,720 435,714 Z" />
        
        {/* Central organic shape - main focal element */}
        <ellipse
          cx="545.97"
          cy="470.38"
          rx="95"
          ry="85"
          fill="#f8d64c"
          fillOpacity="1"
          transform="rotate(-15 545.97 470.38)"
        />
        
        {/* Inner detail elements */}
        <path d="M 520,450 C 540,440 565,445 585,460 C 600,475 605,495 595,515 C 585,535 565,545 545,540 C 525,535 510,520 515,500 C 518,485 520,465 520,450 Z" />
        
        {/* Small accent elements around the center */}
        <circle cx="480" cy="420" r="12" fill="#f8d64c" fillOpacity="0.8" />
        <circle cx="620" cy="430" r="8" fill="#f8d64c" fillOpacity="0.8" />
        <circle cx="590" cy="520" r="10" fill="#f8d64c" fillOpacity="0.8" />
        <circle cx="500" cy="510" r="6" fill="#f8d64c" fillOpacity="0.8" />
      </g>
    </svg>
  );
}