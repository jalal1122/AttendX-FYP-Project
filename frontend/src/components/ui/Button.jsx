const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    success: "bg-success-600 hover:bg-success-700 text-white",
    error: "bg-error-600 hover:bg-error-700 text-white",
    outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
