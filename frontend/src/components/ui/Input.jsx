const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? "border-error-500" : "border-gray-300"
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
};

export default Input;
