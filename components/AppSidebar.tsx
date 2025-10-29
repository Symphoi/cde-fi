"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

// Import icons dari lucide-react
import {
  LayoutDashboard,
  ChevronDown,
  MoreHorizontal,
  DollarSign,
  Wallet,
  Banknote,
  ScrollText,
  Settings,
  Building,
  Package,
  Users,
  Shield,
  CreditCard,
  FolderTree,
  UserRound,
  UserPlus,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    name: "Dashboard",
    subItems: [
      {
        name: "Dashboard",
        path: "/dashboard",
        pro: false,
      },
    ],
  },
  //  SIDE BAR TRANSACTIONS
  {
    icon: <DollarSign className="w-5 h-5" />,
    name: "Transactions",
    subItems: [
      {
        name: "Create Sales Order",
        path: "/salesorder",
        pro: false,
      },
      {
        name: "Create Purchase Order",
        path: "/purchaseorder",
        pro: false,
      },
      {
        name: "Approval Purchase Order",
        path: "/approval-transactions",
        pro: false,
      },
      {
        name: "Deliver to Client",
        path: "/deliver-to-client",
        pro: false,
      },
      {
        name: "Invoice & Payment",
        path: "/invoice-payment",
        pro: false,
      },
    ],
  },
  // SIDE BAR CA
  {
    icon: <Wallet className="w-5 h-5" />,
    name: "Cash Advance",
    subItems: [
      { name: "Create CA",path: "/ca-create", pro: false },
      { name: "Create Transactions CA", path: "/ca-transactions", pro: false },
      { name: "Approval CA", path: "/ca-approval", pro: false },
      { name: "Refund CA", path: "/ca-refund", pro: false },
    ],
  },
  // SIDE BAR Reimburse
  {
    icon: <ScrollText className="w-5 h-5" />,
    name: "Reimbursement",
    subItems: [
      { name: "Create Reimburse", path: "/reimburse-create", pro: false },
      { name: "Approval Reimburse", path: "/reimburse-approval", pro: false },
    ],
  },
  {
    icon: <Banknote className="w-5 h-5" />,
    name: "Accounting",
    subItems: [
      { name: "Kas & Bank", path: "/manual-Rekonsile", pro: false },
      { name: "Bank Rekonsile", path: "/manual-Rekonsile", pro: false },
      { name: "Manual Journal", path: "/manual-Rekonsile", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <Building className="w-5 h-5" />,
    name: "Company Setup",
    subItems: [
      { name: "Companies", path: "/companies", pro: false },
    ],
  },
  {
    icon: <UserRound className="w-5 h-5" />,
    name: "Customers Setup",
    subItems: [
      { name: "Customers", path: "/customers", pro: false },
    ],
  },
   {
    icon: <UserPlus className="w-5 h-5" />,
    name: "Suppliers Setup",
    subItems: [
      { name: "Suppliers", path: "/suppliers", pro: false },
    ],
  },
  {
    icon: <Package className="w-5 h-5" />,
    name: "Products ",
    subItems: [
      { name: "Products", path: "/products", pro: false },
      { name: "Product Categories", path: "/product-categories", pro: false },
    ],
  },
  {
    icon: <Banknote className="w-5 h-5" />,
    name: "Accounting Setup",
    subItems: [

      { name: "Bank Account", path: "/bank-accounts", pro: false },
      { name: "Taxes", path: "/taxes", pro: false },
      { name: "Account", path: "/chart-of-account", pro: false },
      { name: "Account Mapping", path: "/chart-of-Mapping", pro: false },
    ],
  },
  {
    icon: <Shield className="w-5 h-5" />,
    name: "System Settings", 
    subItems: [
      { name: "RBAC", path: "/rbac", pro: false },
      { name: "Projects", path: "/projects", pro: false },
      { name: "Reimbursement Categories", path: "/reimbursement-categories", pro: false },
    ],
  },
];

// Kode component tetap sama...
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDown
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`flex flex-col min-h-full px-5 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:flex-shrink-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <MoreHorizontal className="w-5 h-5" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Settings"
                ) : (
                  <MoreHorizontal className="w-5 h-5" />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;