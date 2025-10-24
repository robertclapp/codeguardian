import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  GitBranch,
  FileSearch,
  GraduationCap,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState({
    repositories: true,
    reviews: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Repositories',
      href: '/repositories',
      icon: GitBranch,
      current: location.pathname === '/repositories',
      badge: '5',
      expandable: true,
      expanded: expandedSections.repositories,
      children: [
        { name: 'All Repositories', href: '/repositories' },
        { name: 'Connected', href: '/repositories?filter=connected' },
        { name: 'Pending Setup', href: '/repositories?filter=pending' }
      ]
    },
    {
      name: 'Reviews',
      href: '/reviews',
      icon: FileSearch,
      current: location.pathname === '/reviews',
      badge: '12',
      expandable: true,
      expanded: expandedSections.reviews,
      children: [
        { name: 'All Reviews', href: '/reviews' },
        { name: 'Completed', href: '/reviews?status=completed' },
        { name: 'In Progress', href: '/reviews?status=in_progress' },
        { name: 'Failed', href: '/reviews?status=failed' }
      ]
    },
    {
      name: 'AI Mentorship',
      href: '/mentorship',
      icon: GraduationCap,
      current: location.pathname === '/mentorship',
      badge: 'New'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings'
    }
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 w-64 h-full pt-20 transition-transform bg-white border-r border-gray-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <div className="flex justify-end p-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="h-full px-3 pb-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {navigation.map((item) => (
              <li key={item.name}>
                <div className="flex items-center">
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center flex-1 p-2 text-gray-900 rounded-lg hover:bg-gray-100 group',
                        isActive && 'bg-gray-100 text-blue-600'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900" />
                    <span className="ml-3">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                  
                  {item.expandable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 ml-1"
                      onClick={() => toggleSection(item.name.toLowerCase())}
                    >
                      {item.expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Expandable children */}
                {item.expandable && item.expanded && item.children && (
                  <ul className="ml-6 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <NavLink
                          to={child.href}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center p-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100',
                              isActive && 'bg-gray-100 text-blue-600'
                            )
                          }
                        >
                          {child.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Quick Actions */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="mt-2 space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Connect Repository
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileSearch className="w-4 h-4 mr-2" />
                Start Review
              </Button>
            </div>
          </div>

          {/* Upgrade Banner */}
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Upgrade to Pro
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Get unlimited reviews, advanced AI features, and priority support.
            </div>
            <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar

