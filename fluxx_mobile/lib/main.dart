import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import 'core/config/app_config.dart';
import 'ui/screens/fluxx_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  MapboxOptions.setAccessToken(AppConfig.mapboxAccessToken);

  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('mr'),
        Locale('bn'),
        Locale('kn'),
        Locale('ta'),
        Locale('gu'),
        Locale('te')
      ],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: const ProviderScope(
        child: FluxxApp(),
      ),
    ),
  );
}

class FluxxApp extends StatelessWidget {
  const FluxxApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FLUXX',
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: const FluxxDashboardScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
