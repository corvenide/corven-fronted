import { useNavigate } from 'react-router-dom';
import DonateView from '../components/DonateView';

export default function DonatePage() {
    const navigate = useNavigate();

    const onBackToHome = () => {
        navigate('/');
    };

    const activeBlock = 0;

    return (
        <DonateView
            onBackToHome={onBackToHome}
            activeBlock={activeBlock}
        />
    );
}