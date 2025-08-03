import { useState } from 'react';
import { BadgeListItem } from '@/components/BadgeListItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Grid, List, Filter } from 'lucide-react';

// Mock badge data
const mockBadges = [
  {
    id: '1',
    name: 'Hank Propane v2',
    year: 2020,
    maker: 'Badge Team Alpha',
    description: 'This is Flat Black with Red LED eyes',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: true,
    isWanted: false,
    retired: false
  },
  {
    id: '2',
    name: 'BSideSKC 2025 - Prototype Face',
    year: 2025,
    maker: 'BSides KC',
    description: 'BSides KC 2025 - Prototype Face',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: true,
    isWanted: false,
    retired: false
  },
  {
    id: '3',
    name: 'SAO Power Brick',
    year: 2020,
    maker: 'Power Systems Inc',
    description: 'This is a Power brick designed to power a single SAO. This uses the SAO 1.69 bis version. Powered by a...',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: true,
    isWanted: true,
    retired: false
  },
  {
    id: '4',
    name: 'Hacker Pager',
    year: 2025,
    maker: 'RetroTech Labs',
    description: 'Introducing the Hacker Pager: a wireless messenger and LoRa radio multitool. Retro-stylish, open-source.',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: false,
    isWanted: true,
    retired: false
  },
  {
    id: '5',
    name: 'OzSec 2024',
    year: 2024,
    maker: 'OzSec Team',
    description: 'Australian security conference badge',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: false,
    isWanted: true,
    retired: false
  },
  {
    id: '6',
    name: 'BSideSKC 2025',
    year: 2025,
    maker: 'BSides KC',
    description: 'A participant badge for BSideSKC 2025. Features an ESP32 and a touch screen display.',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: false,
    isWanted: false,
    retired: false
  },
  {
    id: '7',
    name: 'BSideSKC Down the Rabbit Hole',
    year: 2024,
    maker: 'BSides KC',
    description: 'An LED badge from Badge Pirates soldering village at BSideSKC 2024. These kits were soldered together by...',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: false,
    isWanted: false,
    retired: false
  },
  {
    id: '8',
    name: 'OzSec 2018',
    year: 2018,
    maker: 'OzSec Team',
    description: 'A participant badge for OzSec 2018, a simple non-electronic identifier.',
    imageUrl: '/placeholder.svg',
    externalLink: 'https://example.com',
    isOwned: false,
    isWanted: false,
    retired: true
  }
];

export default function BadgeListMockup() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filteredBadges = mockBadges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.maker?.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (selectedFilter) {
      case 'owned':
        return matchesSearch && badge.isOwned;
      case 'wanted':
        return matchesSearch && badge.isWanted;
      case 'available':
        return matchesSearch && !badge.retired;
      case 'retired':
        return matchesSearch && badge.retired;
      default:
        return matchesSearch;
    }
  });

  const ownedCount = mockBadges.filter(b => b.isOwned).length;
  const wantedCount = mockBadges.filter(b => b.isWanted).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-mono mb-2">Badge Collection - Compact List View</h1>
          <p className="text-muted-foreground">Mockup showing high-density badge display</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search badges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter */}
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Badges ({mockBadges.length})</SelectItem>
                  <SelectItem value="owned">Owned ({ownedCount})</SelectItem>
                  <SelectItem value="wanted">Wishlist ({wantedCount})</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono">{filteredBadges.length}</div>
              <div className="text-sm text-muted-foreground">Total Badges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-green-500">{ownedCount}</div>
              <div className="text-sm text-muted-foreground">Owned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-blue-500">{wantedCount}</div>
              <div className="text-sm text-muted-foreground">Wishlist</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-orange-500">
                {((ownedCount / mockBadges.length) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Collection</div>
            </CardContent>
          </Card>
        </div>

        {/* Badge List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Badges ({filteredBadges.length})</span>
              <span className="text-sm font-normal text-muted-foreground">
                {viewMode === 'list' ? 'Compact View' : 'Grid View'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {filteredBadges.map((badge, index) => (
                  <div key={badge.id} style={{ animationDelay: `${index * 50}ms` }}>
                    <BadgeListItem
                      badge={badge}
                      onOwnershipToggle={(id, type) => console.log('Toggle', id, type)}
                      onBadgeClick={(badge) => console.log('Click', badge)}
                      isAuthenticated={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Grid view would show the original card layout here
              </div>
            )}

            {filteredBadges.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No badges found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benefits Call-out */}
        <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">Compact List View Benefits</CardTitle>
          </CardHeader>
          <CardContent className="text-green-700 dark:text-green-300">
            <ul className="space-y-2 text-sm">
              <li>• <strong>3-4x more badges</strong> visible per screen</li>
              <li>• <strong>Quick scanning</strong> - easier to browse large collections</li>
              <li>• <strong>All info at a glance</strong> - stats, ownership status, and actions</li>
              <li>• <strong>Responsive design</strong> - works on mobile and desktop</li>
              <li>• <strong>Smooth animations</strong> - staggered entrance for visual appeal</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}