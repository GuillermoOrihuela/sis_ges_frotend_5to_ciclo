import "../Css/StatCard.css";

function StatCard({ title, value, description, icon }) {
  return (
    <article className="stat-card">

      <div className="stat-card-top">

        <span className="stat-card-title">
          {title}
        </span>

        <div className="stat-card-icon">
          {icon}
        </div>

      </div>


      <strong className="stat-card-value">
        {value}
      </strong>


      <span className="stat-card-description">
        {description}
      </span>

    </article>
  );
}

export default StatCard;