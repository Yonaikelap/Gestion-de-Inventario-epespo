import React from "react";
import useAuth from "../api/useAuth";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../styles/Dashboard.css";
import fondoPeces from "../assets/videos/fondo-peces.mp4";
import logo from "../assets/Recurso-3-2-scaled.png"; 
const Dashboard = () => {
  useAuth();
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="navbar-fixed">
          <Navbar />
        </div>
        <div className="content-vi">
          <div className="video-container">
            <video
              src={fondoPeces}
              autoPlay
              loop
              muted
              playsInline
              className="dashboard-video"
            />
            <div className="video-overlay">
              <img src={logo} alt="logo" className="overlay-img" />
              <div className="overlay-phrase">
                <span className="overlay-phrase-part">Formando</span>
                <span className="overlay-phrase-part">
                  gente de pesca para el mundo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
