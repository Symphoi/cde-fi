// components/AppSidebar.tsx
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

// Import icons
import {
  LayoutDashboard,
  ChevronDown,
  MoreHorizontal,
  DollarSign,
  Wallet,
  Banknote,
  ScrollText,
  Building,
  Package,
  UserRound,
  UserPlus,
  Shield,
  CreditCard,
} from "lucide-react";

// ======================== TYPES ========================
type Permission = {
  permission_code: string;
  name: string;
  category: string;
  module: string;
  action: string;
};

type SubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  requiredPermissions?: string[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  requiredPermissions?: string[];
  subItems?: SubItem[];
};

// ======================== PERMISSION HOOK ========================
const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('[SIDEBAR] Loading user data from localStorage');
    const userDataStr = localStorage.getItem('user');
    if (userDataStr) {
      try {
        const parsed = JSON.parse(userDataStr);
        setUserData(parsed);
        setPermissions(parsed.permissions || []);
        console.log('[SIDEBAR] Loaded user:', parsed.name, 'Role:', parsed.role?.name);
      } catch (error) {
        console.error('[SIDEBAR] Error parsing user data:', error);
      }
    } else {
      console.log('[SIDEBAR] No user data found in localStorage');
    }
    setLoading(false);
  }, []);

  const hasPermission = useCallback((requiredPermission?: string): boolean => {
    if (!requiredPermission) return true;
    if (loading) return false;
    const has = permissions.some((p: Permission) => p.permission_code === requiredPermission);
    return has;
  }, [permissions, loading]);

  const hasAnyPermission = useCallback((requiredPermissions: string[] = []): boolean => {
    if (!requiredPermissions.length) return true;
    if (loading) return false;
    const has = permissions.some((p: Permission) => 
      requiredPermissions.includes(p.permission_code)
    );
    return has;
  }, [permissions, loading]);

  return { permissions, userData, loading, hasPermission, hasAnyPermission };
};

// ======================== NAV ITEMS DENGAN PERMISSIONS ========================
const getNavItems = (hasAnyPermissionFn: (permissions: string[]) => boolean) => {
  console.log('[SIDEBAR] getNavItems called');
  
  const mainItems: NavItem[] = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      name: "Transactions",
      requiredPermissions: ["TRANS_VIEW"],
      subItems: [
        {
          name: "Create Sales Order",
          path: "/salesorder",
          requiredPermissions: ["SO_CREATE"]
        },
        {
          name: "Create Purchase Order",
          path: "/purchaseorder",
          requiredPermissions: ["PO_CREATE"]
        },
        {
          name: "Approval Purchase Order",
          path: "/approval-transactions",
          requiredPermissions: ["PO_APPROV"]
        },
        {
          name: "Deliver to Client",
          path: "/deliver-to-client",
          requiredPermissions: ["DO_CREATE"]
        },
        {
          name: "Invoice & Payment",
          path: "/invoice-payment",
          requiredPermissions: ["INV_CREATE"]
        },
      ],
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      name: "Cash Advance",
      requiredPermissions: ["CA_VIEW"],
      subItems: [
        { 
          name: "Create CA",
          path: "/ca-create", 
          requiredPermissions: ["CA_CREATE"]
        },
        { 
          name: "Create Transactions CA", 
          path: "/ca-transactions", 
          requiredPermissions: ["CA_CREATE"]
        },
        { 
          name: "Approval CA", 
          path: "/ca-approval", 
          requiredPermissions: ["CA_APPROVE_SPV"]
        },
        { 
          name: "Refund CA", 
          path: "/ca-refund", 
          requiredPermissions: ["CA_UPDATE"]
        },
      ],
    },
    {
      icon: <ScrollText className="w-5 h-5" />,
      name: "Reimbursement",
      requiredPermissions: ["REIM_VIEW"],
      subItems: [
        { 
          name: "Create Reimburse", 
          path: "/reimburse-create", 
          requiredPermissions: ["REIM_CREATE"]
        },
        { 
          name: "Approval Reimburse", 
          path: "/reimburse-approval", 
          requiredPermissions: ["REIM_APPROVE"]
        },
      ],
    },
    {
      icon: <Banknote className="w-5 h-5" />,
      name: "Accounting",
      requiredPermissions: ["REP_VIEW"],
      subItems: [
        { 
          name: "Kas & Bank", 
          path: "/kas-bank", 
          requiredPermissions: ["REP_VIEW"]
        },
        { 
          name: "Bank Rekonsile", 
          path: "/bank-rekonsile", 
          requiredPermissions: ["REP_VIEW"]
        },
        { 
          name: "Manual Journal", 
          path: "/manual-journal", 
          requiredPermissions: ["REP_VIEW"]
        },
      ],
    },
  ];

  const settingsItems: NavItem[] = [
    {
      icon: <Building className="w-5 h-5" />,
      name: "Company Setup",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "Companies", 
          path: "/companies", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
    {
      icon: <UserRound className="w-5 h-5" />,
      name: "Customers Setup",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "Customers", 
          path: "/customers", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
    {
      icon: <UserPlus className="w-5 h-5" />,
      name: "Suppliers Setup",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "Suppliers", 
          path: "/suppliers", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
    {
      icon: <Package className="w-5 h-5" />,
      name: "Products",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "Products", 
          path: "/products", 
          requiredPermissions: ["USER_VIEW"]
        },
        { 
          name: "Product Categories", 
          path: "/product-categories", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      name: "Accounting Setup",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "Bank Account", 
          path: "/bank-accounts", 
          requiredPermissions: ["USER_VIEW"]
        },
        { 
          name: "Taxes", 
          path: "/taxes", 
          requiredPermissions: ["USER_VIEW"]
        },
        { 
          name: "Account", 
          path: "/chart-of-account", 
          requiredPermissions: ["USER_VIEW"]
        },
        { 
          name: "Account Mapping", 
          path: "/accounting-rules", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
    {
      icon: <Shield className="w-5 h-5" />,
      name: "System Settings",
      requiredPermissions: ["USER_VIEW"],
      subItems: [
        { 
          name: "RBAC", 
          path: "/rbac", 
          requiredPermissions: ["ROLE_VIEW"]
        },
        { 
          name: "Projects", 
          path: "/projects", 
          requiredPermissions: ["PROJ_VIEW"]
        },
        { 
          name: "Reimbursement Categories", 
          path: "/reimbursement-categories", 
          requiredPermissions: ["USER_VIEW"]
        },
        { 
          name: "Settings Format", 
          path: "/numbering-sequences", 
          requiredPermissions: ["USER_VIEW"]
        },
      ],
    },
  ];

  // FILTER: Hanya tampilkan menu yang user punya permission
  const filterItems = (items: NavItem[]): NavItem[] => {
    console.log('[SIDEBAR] Filtering items, count:', items.length);
    
    const filtered = items
      .filter((item: NavItem) => {
        if (item.requiredPermissions && item.requiredPermissions.length > 0) {
          const hasAccess = hasAnyPermissionFn(item.requiredPermissions);
          return hasAccess;
        }
        return true;
      })
      .map((item: NavItem) => {
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter((subItem: SubItem) => {
            if (!subItem.requiredPermissions || subItem.requiredPermissions.length === 0) {
              return true;
            }
            return hasAnyPermissionFn(subItem.requiredPermissions);
          });
          
          if (filteredSubItems.length === 0) return null;
          
          return { ...item, subItems: filteredSubItems };
        }
        return item;
      })
      .filter((item): item is NavItem => item !== null);
    
    console.log('[SIDEBAR] Filtered items count:', filtered.length);
    return filtered;
  };

  const result = {
    filteredMainItems: filterItems(mainItems),
    filteredSettingsItems: filterItems(settingsItems)
  };
  
  console.log('[SIDEBAR] Final nav items:', {
    main: result.filteredMainItems.length,
    settings: result.filteredSettingsItems.length
  });
  
  return result;
};

// ======================== SIDEBAR COMPONENT ========================
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission, loading, userData } = usePermissions();
  
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  // Get filtered nav items berdasarkan permissions (stabil dengan useMemo)
  const navItems = useMemo(() => {
    console.log('[SIDEBAR] Recalculating nav items');
    return getNavItems(hasAnyPermission);
  }, [hasAnyPermission]);

  const { filteredMainItems, filteredSettingsItems } = navItems;

  console.log('[SIDEBAR] Current state:', { 
    main: filteredMainItems.length, 
    settings: filteredSettingsItems.length,
    openSubmenu,
    loading,
    isExpanded,
    isHovered,
    isMobileOpen
  });

  const isActive = useCallback((path: string) => {
    return pathname.startsWith(path);
  }, [pathname]);

  // Auto-open submenu based on current path
  useEffect(() => {
    console.log('[SIDEBAR] Auto-open effect checking pathname:', pathname);
    
    let submenuMatched = false;
    
    const checkSubmenu = (items: NavItem[], menuType: "main" | "others") => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              console.log(`[SIDEBAR] Auto-opening submenu: ${menuType}-${index} for path ${subItem.path}`);
              setOpenSubmenu({
                type: menuType,
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    };

    checkSubmenu(filteredMainItems, "main");
    checkSubmenu(filteredSettingsItems, "others");

    if (!submenuMatched) {
      console.log('[SIDEBAR] No submenu matched for current path');
    }
  }, [pathname, isActive, filteredMainItems, filteredSettingsItems]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    console.log('[SIDEBAR] handleSubmenuToggle:', { index, menuType, currentOpenSubmenu: openSubmenu });
    
    setOpenSubmenu((prevOpenSubmenu) => {
      // Jika submenu yang sama diklik, tutup
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        console.log(`[SIDEBAR] Closing submenu ${menuType}-${index}`);
        return null;
      }
      
      // Jika submenu lain diklik, buka yang baru
      console.log(`[SIDEBAR] Opening submenu ${menuType}-${index}`);
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (navItems: NavItem[], menuType: "main" | "others") => {
    console.log(`[SIDEBAR] Rendering ${menuType} items:`, navItems.length);
    
    if (loading) {
      console.log('[SIDEBAR] Still loading permissions');
      return (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
        </div>
      );
    }

    if (navItems.length === 0) {
      console.log(`[SIDEBAR] No ${menuType} items to render`);
      return null;
    }

    return (
      <ul className="flex flex-col gap-4">
        {navItems.map((nav, index) => {
          const hasSubItems = nav.subItems && nav.subItems.length > 0;
          const isOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
          const submenuKey = `${menuType}-${index}`;
          
          console.log(`[SIDEBAR] Rendering item ${submenuKey}:`, {
            name: nav.name,
            hasSubItems,
            isOpen,
            subItemsCount: nav.subItems?.length || 0
          });
          
          return (
            <li key={`${submenuKey}-${nav.name}`}>
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={() => handleSubmenuToggle(index, menuType)}
                  className={`
                    flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer
                    ${isOpen ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
                    ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}
                  `}
                  aria-expanded={isOpen}
                >
                  <span className={`${isOpen ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="ml-3 flex-1 text-sm font-medium whitespace-nowrap">
                        {nav.name}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-brand-500" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
              ) : (
                nav.path && (
                  <Link
                    href={nav.path}
                    className={`
                      flex items-center px-4 py-3 rounded-lg transition-all duration-200
                      ${isActive(nav.path) ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
                      ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}
                    `}
                  >
                    <span className={`${isActive(nav.path) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="ml-3 text-sm font-medium whitespace-nowrap">
                        {nav.name}
                      </span>
                    )}
                  </Link>
                )
              )}
              
              {hasSubItems && (isExpanded || isHovered || isMobileOpen) && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? '' : 'max-h-0 opacity-0'
                  }`}
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s ease',
                  }}
                >
                  <ul className="mt-2 space-y-1 ml-12 min-h-0 overflow-hidden">
                    {nav.subItems?.map((subItem) => (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.path}
                          className={`
                            block px-3 py-2 text-sm rounded-md transition-colors duration-150
                            ${isActive(subItem.path) 
                              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-300'
                            }
                          `}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
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
        className={`py-8 flex ${
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
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo.png"
              alt="Logo"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>
      
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {filteredMainItems.length > 0 && (
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
                {renderMenuItems(filteredMainItems, "main")}
              </div>
            )}

            {filteredSettingsItems.length > 0 && (
              <div>
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
                {renderMenuItems(filteredSettingsItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* DISPLAY USER YANG LOGIN - TAMBAHAN DI BAWAH SIDEBAR */}
      {(isExpanded || isHovered || isMobileOpen) && userData && (
        <div className="mt-auto mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
                <UserRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {userData.name || userData.email}
              </p> 
              {/* <p className="text-xs text-gray-500 dark:text-gray-400">
                {userData.role?.name || "No Role"}
              </p> */}
            </div>
          </div>
        </div>
      )}

      {/* Display user dalam mode collapsed */}
      {(!isExpanded && !isHovered && !isMobileOpen) && userData && (
        <div className="mt-auto mb-6 flex justify-center">
          <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
            <UserRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;