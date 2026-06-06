import PropTypes from "prop-types";

/**
 * Input Component - Base untuk semua form input
 * Supports: text, email, password, number, textarea
 * States: default, error, success, disabled
 */
export default function Input({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    error,
    success,
    helperText,
    disabled = false,
    required = false,
    name,
    id,
    rows = 4,
    className = "",
    ...props
}) {
    const inputId = id || name;

    // Base styles
    const baseStyles =
        "w-full px-4 py-3 text-field-1 rounded-xl border-2 transition-all duration-200 focus:outline-none disabled:bg-neutral-softWhite disabled:cursor-not-allowed placeholder:text-neutral-lGrey";

    // State styles
    const stateStyles = error
        ? "border-danger-2 focus:border-danger-1 focus:ring-2 focus:ring-danger-l"
        : success
          ? "border-success-1 focus:border-success-d focus:ring-2 focus:ring-success-l"
          : "border-neutral-softWhite focus:border-brand-blue-1 focus:ring-2 focus:ring-secondary-3";

    const InputElement = type === "textarea" ? "textarea" : "input";

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block mb-2 text-field-1 font-medium text-neutral-secBlack"
                >
                    {label}
                    {required && <span className="text-danger-2 ml-1">*</span>}
                </label>
            )}

            <InputElement
                id={inputId}
                name={name}
                type={type !== "textarea" ? type : undefined}
                rows={type === "textarea" ? rows : undefined}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className={`${baseStyles} ${stateStyles}`}
                {...props}
            />

            {/* Helper text or error message */}
            {(helperText || error) && (
                <p
                    className={`mt-2 text-field-2 ${
                        error
                            ? "text-danger-2"
                            : success
                              ? "text-success-d"
                              : "text-neutral-grey"
                    }`}
                >
                    {error || helperText}
                </p>
            )}
        </div>
    );
}

Input.propTypes = {
    label: PropTypes.string,
    type: PropTypes.oneOf(["text", "email", "password", "number", "textarea"]),
    placeholder: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    error: PropTypes.string,
    success: PropTypes.bool,
    helperText: PropTypes.string,
    disabled: PropTypes.bool,
    required: PropTypes.bool,
    name: PropTypes.string,
    id: PropTypes.string,
    rows: PropTypes.number,
    className: PropTypes.string,
};
