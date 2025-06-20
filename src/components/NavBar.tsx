function Message() {
  return (
    <>
      <nav className="navbar navbar-dark bg-dark px-4">
        <a className="navbar-brand" href="/">
          MyApp
        </a>
        <div className="d-flex flex-column flex-lg-row ms-auto gap-3">
          <span className="lead fw-normal text-white">Home</span>
        </div>
        <div className="d-flex flex-column flex-lg-row ms-auto gap-3">
          <a className="btn btn-outline-light" href="#about">
            About
          </a>
          <a className="btn btn-outline-light" href="#contact">
            Contact Us
          </a>
          <a className="btn btn-primary" href="#login">
            Login
          </a>
        </div>
      </nav>
    </>
  );
}

export default Message;
