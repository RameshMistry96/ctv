import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FiGrid,
  FiTruck,
  FiNavigation,
  FiCalendar,
  FiMonitor,
  FiLogOut,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";

export default function AdminLayout({
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [tvOpen, setTvOpen] =
    useState(true);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    sessionStorage.removeItem(
      "admin_auth"
    );

    sessionStorage.removeItem(
      "admin_login_time"
    );

    navigate(
      "/ctv-admin/login"
    );
  };

  /* =====================================================
     OPEN TV BOARD
  ===================================================== */

  const openBoard = (mode) => {
    localStorage.setItem(
      "ctv_board_mode",
      mode
    );

    navigate("/tv");
  };

  /* =====================================================
     MAIN MENU
  ===================================================== */

  const menu = [
    {
      name: "Dashboard",
      path: "/ctv-admin/dashboard",
      icon: <FiGrid />,
    },

    {
      name: "Admin Routes",
      path: "/ctv-admin",
      icon: <FiTruck />,
    },

    {
      name: "Admin Flights",
      path: "/ctv-admin/flights",
      icon: <FiNavigation />,
    },

    {
      name: "Weekly Templates",
      path: "/ctv-admin/templates",
      icon: <FiCalendar />,
    },
  ];

  return (
    <div style={layoutStyle}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-menu-link {
          transition:
            background .18s ease,
            color .18s ease,
            transform .18s ease;
        }

        .admin-menu-link:hover {
          background: #fff1f7 !important;
          color: #ec2772 !important;
          transform: translateX(2px);
        }

        .admin-tv-parent {
          transition:
            background .18s ease,
            color .18s ease;
        }

        .admin-tv-parent:hover {
          background: #fff7fa !important;
          color: #ec2772 !important;
        }

        .admin-tv-subitem {
          transition:
            background .18s ease,
            color .18s ease,
            transform .18s ease;
        }

        .admin-tv-subitem:hover {
          background: #fff7fa !important;
          color: #ec2772 !important;
          transform: translateX(2px);
        }

        .admin-logout-btn {
          transition:
            background .18s ease,
            transform .18s ease;
        }

        .admin-logout-btn:hover {
          background: #fff1f2 !important;
          transform: translateX(2px);
        }

        /* =====================================================
           TABLET / MOBILE
        ===================================================== */

        @media (max-width: 900px) {
          .admin-sidebar {
            display: none !important;
          }

          .admin-content {
            width: 100% !important;
            padding-bottom: 88px !important;
          }

          .admin-mobile-nav {
            display: grid !important;
          }
        }

        @media (max-width: 600px) {
          .admin-mobile-nav {
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
          }
        }
      `}</style>

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside
        className="admin-sidebar"
        style={sidebarStyle}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <div
          style={
            brandHeaderStyle
          }
        >
          <div
            style={
              brandLogoStyle
            }
          >
            <img
              src="/favicon.ico"
              alt="CTV System"
              style={{
                width: 38,
                height: 38,
                objectFit:
                  "contain",
              }}
            />
          </div>

          <div>
            <div
              style={
                brandTitleStyle
              }
            >
              CTV SYSTEM
            </div>

            <div
              style={
                brandSubTitleStyle
              }
            >
              Route Operations
            </div>
          </div>
        </div>

        {/* =================================================
            MAIN MENU
        ================================================= */}

        <div
          style={
            menuAreaStyle
          }
        >
          {menu.map(
            (item) => {
              const active =
                location.pathname ===
                item.path;

              return (
                <Link
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className="admin-menu-link"
                  style={{
                    ...menuItemStyle,

                    background:
                      active
                        ? "linear-gradient(90deg,#fff0f6,#fff7fa)"
                        : "transparent",

                    color:
                      active
                        ? "#ec2772"
                        : "#18243b",

                    borderLeft:
                      active
                        ? "3px solid #ec2772"
                        : "3px solid transparent",
                  }}
                >
                  <span
                    style={{
                      ...menuIconStyle,

                      color:
                        active
                          ? "#ec2772"
                          : "#53627a",
                    }}
                  >
                    {
                      item.icon
                    }
                  </span>

                  <span>
                    {
                      item.name
                    }
                  </span>
                </Link>
              );
            }
          )}

          {/* =================================================
              OPERATIONS LABEL
          ================================================= */}

          <div
            style={
              menuSectionLabelStyle
            }
          >
            OPERATIONS
          </div>

          {/* =================================================
              TV BOARD PARENT
          ================================================= */}

          <button
            type="button"
            className="admin-tv-parent"
            onClick={() =>
              setTvOpen(
                (open) =>
                  !open
              )
            }
            style={
              tvParentStyle
            }
          >
            <span
              style={
                menuIconStyle
              }
            >
              <FiMonitor />
            </span>

            <span
              style={{
                flex: 1,
              }}
            >
              TV Board
            </span>

            <span
              style={
                chevronStyle
              }
            >
              {tvOpen ? (
                <FiChevronDown />
              ) : (
                <FiChevronRight />
              )}
            </span>
          </button>

          {/* =================================================
              TV BOARD SUBMENU
          ================================================= */}

          {tvOpen && (
            <div
              style={
                tvSubmenuStyle
              }
            >
              {/* DEPARTURE */}

              <button
                type="button"
                className="admin-tv-subitem"
                onClick={() =>
                  openBoard(
                    "DEPARTURE"
                  )
                }
                style={
                  tvSubItemStyle
                }
              >
                <span
                  style={{
                    ...tvDotStyle,
                    background:
                      "#ec2772",
                  }}
                />

                <span>
                  Departure Board
                </span>
              </button>

              {/* ARRIVAL */}

              <button
                type="button"
                className="admin-tv-subitem"
                onClick={() =>
                  openBoard(
                    "ARRIVAL"
                  )
                }
                style={
                  tvSubItemStyle
                }
              >
                <span
                  style={{
                    ...tvDotStyle,
                    background:
                      "#8b5cf6",
                  }}
                />

                <span>
                  Arrival Board
                </span>
              </button>

              {/* FLIGHT */}

              <button
                type="button"
                className="admin-tv-subitem"
                onClick={() =>
                  openBoard(
                    "FLIGHT"
                  )
                }
                style={
                  tvSubItemStyle
                }
              >
                <span
                  style={{
                    ...tvDotStyle,
                    background:
                      "#2563eb",
                  }}
                />

                <span>
                  Flight Board
                </span>
              </button>
            </div>
          )}
        </div>

        {/* =====================================================
            SIDEBAR BOTTOM
        ===================================================== */}

        <div
          style={
            sidebarBottomStyle
          }
        >
          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <div
            style={
              systemStatusStyle
            }
          >
            <div
              style={
                systemStatusHeaderStyle
              }
            >
              <FiCheckCircle
                style={{
                  color:
                    "#22c55e",

                  fontSize:
                    16,
                }}
              />

              <span>
                System Status
              </span>
            </div>

            <div
              style={
                systemStatusTextStyle
              }
            >
              All Systems
              Operational
            </div>
          </div>

          {/* =================================================
              LOGOUT
          ================================================= */}

          <button
            onClick={
              handleLogout
            }
            className="admin-logout-btn"
            style={
              logoutButtonStyle
            }
          >
            <FiLogOut />

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <main
        className="admin-content"
        style={
          contentStyle
        }
      >
        {children}
      </main>

      {/* =====================================================
          MOBILE NAVIGATION
      ===================================================== */}

      <div
        className="admin-mobile-nav"
        style={
          mobileNavStyle
        }
      >
        {menu.map(
          (item) => {
            const active =
              location.pathname ===
              item.path;

            return (
              <Link
                key={
                  item.path
                }
                to={
                  item.path
                }
                style={{
                  ...mobileNavItemStyle,

                  color:
                    active
                      ? "#ec2772"
                      : "#64748b",

                  background:
                    active
                      ? "#fff1f7"
                      : "transparent",
                }}
              >
                <span
                  style={
                    mobileIconStyle
                  }
                >
                  {
                    item.icon
                  }
                </span>

                <span>
                  {
                    item.name
                  }
                </span>
              </Link>
            );
          }
        )}
      </div>
    </div>
  );
}

/* ==========================================================
   MAIN LAYOUT
========================================================== */

const layoutStyle = {
  display: "flex",

  width: "100%",

  minHeight:
    "100vh",

  background:
    "#f6f7fb",

  fontFamily:
    "Inter, Arial, Helvetica, sans-serif",
};

/* ==========================================================
   SIDEBAR
========================================================== */

const sidebarStyle = {
  width: 255,

  minWidth:
    255,

  minHeight:
    "100vh",

  height:
    "100vh",

  position:
    "sticky",

  top:
    0,

  display:
    "flex",

  flexDirection:
    "column",

  background:
    "#ffffff",

  borderRight:
    "1px solid #edf0f5",

  boxShadow:
    "5px 0 24px rgba(30,41,59,.035)",

  overflow:
    "hidden",

  zIndex:
    50,
};

/* ==========================================================
   BRAND
========================================================== */

const brandHeaderStyle = {
  minHeight:
    94,

  padding:
    "18px 20px",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    13,

  background:
    "linear-gradient(135deg,#ff3867 0%,#ec2772 45%,#9b3ce7 100%)",

  color:
    "#ffffff",
};

const brandLogoStyle = {
  width:
    48,

  height:
    48,

  display:
    "grid",

  placeItems:
    "center",

  borderRadius:
    13,

  background:
    "rgba(255,255,255,.16)",

  border:
    "1px solid rgba(255,255,255,.22)",

  flexShrink:
    0,
};

const brandTitleStyle = {
  fontSize:
    18,

  lineHeight:
    1,

  fontWeight:
    900,

  letterSpacing:
    "-.02em",
};

const brandSubTitleStyle = {
  marginTop:
    6,

  fontSize:
    11,

  fontWeight:
    600,

  color:
    "rgba(255,255,255,.82)",
};

/* ==========================================================
   MENU
========================================================== */

const menuAreaStyle = {
  padding:
    "20px 14px",

  display:
    "flex",

  flexDirection:
    "column",

  gap:
    5,
};

const menuItemStyle = {
  width:
    "100%",

  minHeight:
    47,

  padding:
    "0 15px",

  borderRadius:
    7,

  display:
    "flex",

  alignItems:
    "center",

  gap:
    13,

  textDecoration:
    "none",

  fontSize:
    13,

  fontWeight:
    800,

  cursor:
    "pointer",
};

const menuIconStyle = {
  width:
    21,

  minWidth:
    21,

  fontSize:
    18,

  display:
    "grid",

  placeItems:
    "center",
};

const menuSectionLabelStyle = {
  margin:
    "25px 15px 8px",

  color:
    "#94a3b8",

  fontSize:
    9,

  fontWeight:
    900,

  letterSpacing:
    ".12em",
};

/* ==========================================================
   TV BOARD
========================================================== */

const tvParentStyle = {
  width:
    "100%",

  minHeight:
    47,

  padding:
    "0 15px",

  borderRadius:
    7,

  border:
    "none",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    13,

  background:
    "transparent",

  color:
    "#18243b",

  fontSize:
    13,

  fontWeight:
    800,

  fontFamily:
    "inherit",

  cursor:
    "pointer",

  textAlign:
    "left",
};

const chevronStyle = {
  width:
    18,

  display:
    "grid",

  placeItems:
    "center",

  color:
    "#64748b",

  fontSize:
    15,
};

const tvSubmenuStyle = {
  position:
    "relative",

  display:
    "flex",

  flexDirection:
    "column",

  marginLeft:
    27,

  paddingLeft:
    17,

  paddingTop:
    2,

  gap:
    2,

  borderLeft:
    "1px solid #e2e8f0",
};

const tvSubItemStyle = {
  position:
    "relative",

  width:
    "100%",

  minHeight:
    36,

  padding:
    "0 8px",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    10,

  border:
    "none",

  borderRadius:
    6,

  background:
    "transparent",

  color:
    "#334155",

  fontFamily:
    "inherit",

  fontSize:
    11,

  fontWeight:
    700,

  textAlign:
    "left",

  cursor:
    "pointer",
};

const tvDotStyle = {
  width:
    7,

  height:
    7,

  borderRadius:
    "50%",

  flexShrink:
    0,

  boxShadow:
    "0 0 0 3px rgba(255,255,255,1)",
};

/* ==========================================================
   SIDEBAR BOTTOM
========================================================== */

const sidebarBottomStyle = {
  marginTop:
    "auto",

  padding:
    "12px 16px 19px",
};

const systemStatusStyle = {
  padding:
    "14px 15px",

  marginBottom:
    13,

  borderRadius:
    10,

  background:
    "#ffffff",

  border:
    "1px solid #e5eaf1",

  boxShadow:
    "0 5px 18px rgba(15,23,42,.035)",
};

const systemStatusHeaderStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap:
    8,

  color:
    "#18243b",

  fontSize:
    11,

  fontWeight:
    900,
};

const systemStatusTextStyle = {
  marginTop:
    7,

  color:
    "#16a34a",

  fontSize:
    10,

  fontWeight:
    700,
};

const logoutButtonStyle = {
  width:
    "100%",

  minHeight:
    46,

  padding:
    "0 15px",

  borderRadius:
    8,

  border:
    "1px solid #ffe4e9",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    12,

  background:
    "#ffffff",

  color:
    "#ef335f",

  fontSize:
    12,

  fontWeight:
    900,

  cursor:
    "pointer",
};

/* ==========================================================
   CONTENT
========================================================== */

const contentStyle = {
  flex:
    1,

  minWidth:
    0,

  minHeight:
    "100vh",

  background:
    "linear-gradient(180deg,#fafbfe 0%,#f5f7fb 100%)",
};

/* ==========================================================
   MOBILE NAV
========================================================== */

const mobileNavStyle = {
  display:
    "none",

  position:
    "fixed",

  left:
    10,

  right:
    10,

  bottom:
    10,

  gridTemplateColumns:
    "repeat(4,1fr)",

  padding:
    7,

  borderRadius:
    16,

  border:
    "1px solid #e5e7eb",

  background:
    "rgba(255,255,255,.96)",

  boxShadow:
    "0 15px 40px rgba(15,23,42,.16)",

  backdropFilter:
    "blur(14px)",

  zIndex:
    1000,
};

const mobileNavItemStyle = {
  minHeight:
    57,

  padding:
    "6px 4px",

  borderRadius:
    11,

  display:
    "flex",

  flexDirection:
    "column",

  alignItems:
    "center",

  justifyContent:
    "center",

  gap:
    4,

  textDecoration:
    "none",

  fontSize:
    9,

  fontWeight:
    900,

  textAlign:
    "center",
};

const mobileIconStyle = {
  fontSize:
    19,
};