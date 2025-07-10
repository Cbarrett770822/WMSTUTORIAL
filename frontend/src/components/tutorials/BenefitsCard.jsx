import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * Component to display process benefits in a card format
 */
const BenefitsCard = ({ process }) => {
  const theme = useTheme();

  // If no process or no benefits, show a placeholder
  if (!process || !process.benefits || process.benefits.length === 0) {
    return (
      <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader 
          title="Process Benefits" 
          titleTypographyProps={{ variant: 'h6' }}
          sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}
        />
        <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No benefits information available for this process.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader 
        title={`${process.title || process.name} Benefits`}
        titleTypographyProps={{ variant: 'h6' }}
        sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        <List disablePadding>
          {process.benefits.map((benefit, index) => (
            <React.Fragment key={benefit.id || `benefit-${index}`}>
              {index > 0 && <Divider variant="inset" component="li" />}
              <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {index % 2 === 0 ? 
                    <TrendingUpIcon color="secondary" /> : 
                    <CheckCircleOutlineIcon color="secondary" />
                  }
                </ListItemIcon>
                <ListItemText
                  primary={benefit.title || ''}
                  secondary={
                    <Typography
                      component="span"
                      variant="body2"
                      color="textPrimary"
                      sx={{ display: 'inline' }}
                    >
                      {/* Use a custom function to format the benefit description */}
                      {(() => {
                        const text = benefit.description || '';
                        // Create a formatted version with highlighted metrics
                        const formattedParts = [];
                        
                        // Simple regex to find arrows and percentages
                        const regex = /([↑↓→←]|\d+\s*%|\d+\s*[–-]\s*\d+\s*%)/g;
                        let lastIndex = 0;
                        let match;
                        
                        // Find all matches and build the formatted parts
                        while ((match = regex.exec(text)) !== null) {
                          // Add the text before this match
                          if (match.index > lastIndex) {
                            formattedParts.push(
                              <React.Fragment key={`text-${lastIndex}`}>
                                {text.substring(lastIndex, match.index)}
                              </React.Fragment>
                            );
                          }
                          
                          // Add the highlighted match
                          formattedParts.push(
                            <Typography 
                              key={`highlight-${match.index}`} 
                              component="span" 
                              sx={{ 
                                fontWeight: 'bold', 
                                color: theme.palette.success.main 
                              }}
                            >
                              {match[0]}
                            </Typography>
                          );
                          
                          lastIndex = match.index + match[0].length;
                        }
                        
                        // Add any remaining text
                        if (lastIndex < text.length) {
                          formattedParts.push(
                            <React.Fragment key={`text-${lastIndex}`}>
                              {text.substring(lastIndex)}
                            </React.Fragment>
                          );
                        }
                        
                        return formattedParts.length > 0 ? formattedParts : text;
                      })()}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default BenefitsCard;
