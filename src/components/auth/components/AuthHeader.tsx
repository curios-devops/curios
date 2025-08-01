import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';

interface AuthHeaderProps {
  mode: 'signin' | 'signup';
  context?: 'default' | 'pro' | 'library' | 'spaces';
}

export default function AuthHeader({ mode, context = 'default' }: AuthHeaderProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const messages = {
    default: {
      signin: {
        title: '', // Remove title
        subtitle: '' // Remove subtitle
      },
      signup: {
        title: t('welcome'),
        subtitle: t('sign_up_to_curios_ai')
      }
    },
    pro: {
      signin: {
        title: 'Unlock Pro Search',
        subtitle: 'Sign in to access our most powerful search'
      },
      signup: {
        title: 'Empower your Curiosity',
        subtitle: 'Sign up to try Pro Search for free'
      }
    },
    library: {
      signin: {
        title: 'Keep Track of Your Ideas',
        subtitle: 'Sign in to save your favorite searches'
      },
      signup: {
        title: 'Never Lose an Insight',
        subtitle: 'Sign up to save your discoveries'
      }
    },
    spaces: {
      signin: {
        title: 'Join the Conversation',
        subtitle: 'Sign in to connect with curious minds'
      },
      signup: {
        title: 'Be Part of Something Bigger',
        subtitle: 'Sign up to share ideas with others'
      }
    }
  };

  const content = messages[context][mode];

  return (
    <div className="text-center">
      <h2 className={`text-3xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        {content.title}
      </h2>
      <p className="text-gray-400 text-sm">
        {content.subtitle}
      </p>
    </div>
  );
}