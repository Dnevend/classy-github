const Loading = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 200"
    className="w-8 h-8"
  >
    <circle
      fill="#000000"
      stroke="#000000"
      strokeWidth="15"
      r="15"
      cx="40"
      cy="100"
    >
      <animate
        attributeName="opacity"
        calcMode="spline"
        dur="2"
        values="1;0;1;"
        keySplines=".5 0 .5 1;.5 0 .5 1"
        repeatCount="indefinite"
        begin="-.4"
      ></animate>
    </circle>
    <circle
      fill="#000000"
      stroke="#000000"
      strokeWidth="15"
      r="15"
      cx="100"
      cy="100"
    >
      <animate
        attributeName="opacity"
        calcMode="spline"
        dur="2"
        values="1;0;1;"
        keySplines=".5 0 .5 1;.5 0 .5 1"
        repeatCount="indefinite"
        begin="-.2"
      ></animate>
    </circle>
    <circle
      fill="#000000"
      stroke="#000000"
      strokeWidth="15"
      r="15"
      cx="160"
      cy="100"
    >
      <animate
        attributeName="opacity"
        calcMode="spline"
        dur="2"
        values="1;0;1;"
        keySplines=".5 0 .5 1;.5 0 .5 1"
        repeatCount="indefinite"
        begin="0"
      ></animate>
    </circle>
  </svg>
);

export default Loading;
