import "../Css/AdminButton.css";

function AdminButton({ variant = "primary", children, ...props }) {
  return (
    <button className={`admin-button admin-button-${variant}`} {...props}>
      {children}
    </button>
  );
}

export default AdminButton;
