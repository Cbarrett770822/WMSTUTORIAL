import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  CardActionArea,
  Box,
  Chip
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { selectProcess } from '../../features/processes/processesSlice';

// Map of icon names to MUI icon components
const iconMap = {
  'warehouse': WarehouseIcon,
  'inventory': InventoryIcon,
  'local_shipping': LocalShippingIcon,
  'shopping_cart': ShoppingCartIcon,
  'assignment_return': AssignmentReturnIcon,
  'inventory_2': Inventory2Icon
};

// Category color mapping
const getCategoryColor = (category) => {
  const categoryMap = {
    'inbound': '#1976d2', // blue
    'storage': '#2e7d32', // green
    'outbound': '#d32f2f', // red
    'advanced': '#9c27b0', // purple
    'returns': '#9c27b0', // purple (same as advanced)
    'general': '#757575'  // gray
  };
  
  // Normalize category name to lowercase for comparison
  const normalizedCategory = category?.toLowerCase() || 'general';
  console.log(`Getting color for category: ${normalizedCategory}`);
  return categoryMap[normalizedCategory] || '#757575'; // default gray
};

const ProcessCard = ({ process }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const IconComponent = iconMap[process.icon] || WarehouseIcon;
  
  const handleCardClick = () => {
    // Use _id as fallback when id is not available
    const processId = process.id || process._id;
    dispatch(selectProcess(processId));
    navigate(`/flow/${processId}`);
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}
    >
      <CardActionArea 
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        onClick={handleCardClick}
      >
        <Box 
          sx={{ 
            height: 140, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'primary.light',
            position: 'relative'
          }}
        >
          <IconComponent sx={{ fontSize: 80, color: 'white' }} />
          <Chip 
            label={(process.category && typeof process.category === 'string') ? 
              process.category.charAt(0).toUpperCase() + process.category.slice(1) : 
              'General'} 
            size="small" 
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8,
              bgcolor: getCategoryColor(process.category),
              color: 'white'
            }} 
          />
          {/* Debug info removed */}
        </Box>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography gutterBottom variant="h5" component="div">
            {process.title || process.name || 'Untitled Process'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {process.description || 'No description available.'}
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="caption" color="text.secondary">
              {process.steps?.length || 0} process flow steps
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ProcessCard;
