import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6 animate-fade-in">
        {/* Logo/Branding */}
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
            Venquis
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Recruitment Contract Analysis
          </p>
        </div>

        {/* Description */}
        <div className="max-w-lg mx-auto">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Streamline your contract review process with AI-powered analysis.
            Get instant insights and recommendations for recruitment agreements.
          </p>
        </div>

        {/* CTA Button */}
        <div>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
          >
            Start Analysis
          </Button>
        </div>

      </div>
    </div>
  );
};

export default Landing;