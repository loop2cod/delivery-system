'use client';

import { Fragment } from 'react';
import { Menu, Popover, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  WifiIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useAdmin } from '@/providers/AdminProvider';
import { usePWA } from '@/providers/PWAProvider';

const userNavigation = [
  { name: 'Your profile', href: '/profile' },
  { name: 'Settings', href: '/settings' },
  { name: 'Sign out', href: '#', action: 'logout' },
];

const notifications = [
  {
    id: 1,
    title: 'New inquiry received',
    message: 'Sarah Johnson requested same-day delivery',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    title: 'Driver available',
    message: 'Omar Hassan completed his delivery',
    time: '15 min ago',
    unread: true,
  },
  {
    id: 3,
    title: 'Package delivered',
    message: 'Package #PKG-2024-001 was delivered successfully',
    time: '1 hour ago',
    unread: false,
  },
];

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAdmin();
  const { isOnline, isInstallable, installPWA, updateAvailable, updatePWA } = usePWA();

  const handleUserNavigation = (item: typeof userNavigation[0]) => {
    if (item.action === 'logout') {
      logout();
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search inquiries, packages, drivers..."
            type="search"
            name="search"
          />
        </form>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Connection status */}
          <div className="flex items-center gap-x-2">
            {isOnline ? (
              <div className="flex items-center text-green-600">
                <WifiIcon className="h-4 w-4" />
                <span className="sr-only">Online</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <SignalIcon className="h-4 w-4" />
                <span className="sr-only">Offline</span>
              </div>
            )}
          </div>

          {/* PWA Install/Update */}
          {(isInstallable || updateAvailable) && (
            <div className="flex items-center gap-x-2">
              {isInstallable && (
                <button
                  onClick={installPWA}
                  className="relative rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
                  Install App
                </button>
              )}
              
              {updateAvailable && (
                <button
                  onClick={updatePWA}
                  className="relative rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Update Available
                </button>
              )}
            </div>
          )}

          {/* Notifications */}
          <Popover className="relative">
            <Popover.Button className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-xs text-white flex items-center justify-center font-semibold">
                  {unreadCount}
                </span>
              )}
            </Popover.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 transform">
                <div className="rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={clsx(
                          'border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors',
                          notification.unread && 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={clsx(
                            'mt-1 h-2 w-2 rounded-full',
                            notification.unread ? 'bg-accent' : 'bg-gray-300'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <button className="text-sm font-medium text-primary hover:text-primary/80">
                      View all notifications
                    </button>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user?.name?.[0] || 'A'}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                  {user?.name}
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <button
                        onClick={() => handleUserNavigation(item)}
                        className={clsx(
                          active ? 'bg-gray-50' : '',
                          'block w-full text-left px-3 py-1 text-sm leading-6 text-gray-900'
                        )}
                      >
                        {item.name}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}