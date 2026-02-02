type NextActionBarProps = {
  title: string;
  detail?: string;
};

const NextActionBar = ({ title, detail }: NextActionBarProps) => {
  return (
    <section className="next-action">
      <div className="next-action-label">Next</div>
      <div className="next-action-content">
        <div className="next-action-title">{title}</div>
        {detail ? <div className="next-action-detail">{detail}</div> : null}
      </div>
    </section>
  );
};

export default NextActionBar;
